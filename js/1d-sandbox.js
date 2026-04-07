// 1d-sandbox.js

// ==========================
// Signal Generators
// ==========================
function normalize(signal) {
    const max = Math.max(...signal.map(Math.abs));
    return signal.map(x => x / max);
}

function generateRichSignal(n = 64) {
    return Array.from({ length: n }, (_, i) => {
        const t = i / n;

        return (
            Math.sin(2 * Math.PI * 1 * t) +
            0.5 * Math.sin(2 * Math.PI * 3 * t) +
            0.25 * Math.sin(2 * Math.PI * 7 * t) +
            0.2 * Math.sin(2 * Math.PI * 11 * t)
        );
    });
}

function generateLowFreq(n = 64) {
    return Array.from({ length: n }, (_, i) => {
        const t = i / n;
        return Math.sin(2 * Math.PI * 1 * t);
    });
}

function generateMixedSignal(n = 64) {
    return Array.from({ length: n }, (_, i) => {
        const t = i / n;

        return (
            Math.sin(2 * Math.PI * 1 * t) +
            Math.sin(2 * Math.PI * 4 * t) +
            Math.sin(2 * Math.PI * 9 * t)
        );
    });
}

function generateHighFreq(n = 64) {
    return Array.from({ length: n }, (_, i) => {
        const t = i / n;

        return (
            Math.sin(2 * Math.PI * 8 * t) +
            0.5 * Math.sin(2 * Math.PI * 12 * t) +
            0.3 * Math.sin(2 * Math.PI * 16 * t)
        );
    });
}

function generateImpulse(n = 64) {
    const arr = new Array(n).fill(0);
    arr[0] = 1;
    return arr;
}

// ==========================
// Kernels
// ==========================
const kernels = {
    smoothing: [1, 1, 1, 1, 1, 1, 1, 1].map(v => v / 8),
    lowpass: [1, 1, 1, 3, 5, 6, 6, 6, 6, 5, 3, 1, 1, 1].map(v => v / 16),
    echo: [1, 0, 0, 0, 0.6, 0, 0, 0, 0.3],
    reverb: [0.6, 0.3, 0.1, 0.05],
};

const presets = {
    "Signal Smoothing": {
        signal: "Mixed Signal (Multi-Frequency + Multi-Amplitude)",
        kernel: "smoothing"
    },
    "Low Pass Filtering": {
        signal: "Mixed Signal (Multi-Frequency)",
        kernel: "lowpass"
    },
    "Echo Effect": {
        signal: "Impulse (Audio Effects)",
        kernel: "echo"
    },
    "Reverb Effect": {
        signal: "Impulse (Audio Effects)",
        kernel: "reverb"
    },
};

const kernelDescriptions = {
    smoothing: {
        title: "Averaging (Smoothing Kernel)",
        desc: "Each output point is the average of neighbouring samples. This reduces rapid changes in the signal.",
        insights: [
            "Wide kernels = stronger smoothing",
            "Sharp peaks get flattened",
            "High frequencies are reduced"
        ]
    },

    lowpass: {
        title: "Weighted Low-Pass Filter",
        desc: "Central values are weighted more heavily than distant ones, preserving slow trends while removing fast oscillations. Similar to the smoothing kernel.",
        insights: [
            "Acts like a soft blur in time domain",
            "Reduces high-frequency components",
            "More natural than uniform averaging",
            "Far from ideal rectangular wave, but the general effects can still be seen"
        ]
    },

    echo: {
        title: "Discrete Echo Kernel",
        desc: "Non-zero spikes create delayed copies of the signal. Each spike acts like a time-shifted version of the input.",
        insights: [
            "Spacing controls echo delay",
            "Amplitude controls echo strength",
            "Sparse structure = clear repeats"
        ]
    },

    reverb: {
        title: "Decaying Reverb Kernel",
        desc: "A sequence of decreasing values creates overlapping delayed copies, simulating acoustic reflections.",
        insights: [
            "Dense echoes blend together",
            "Exponential decay controls tail length",
            "Creates a smoothed temporal blur"
        ]
    }
};

// ==========================
// Convolution
// ==========================
function convolve(signal, kernel) {
    const output = new Array(signal.length).fill(0);

    for (let i = 0; i < signal.length; i++) {
        for (let j = 0; j < kernel.length; j++) {
            if (i - j >= 0) {
                output[i] += signal[i - j] * kernel[j];
            }
        }
    }
    return output;
}

function computeFFT(signal) {
    const fft = new FFT(signal.length);
    const out = fft.createComplexArray();

    fft.realTransform(out, signal);
    fft.completeSpectrum(out);

    return out;
}

function magnitude(complexArray) {
    const mag = [];
    for (let i = 0; i < complexArray.length; i += 2) {
        const re = complexArray[i];
        const im = complexArray[i + 1];
        mag.push(Math.sqrt(re * re + im * im));
    }
    return mag;
}

function pad(arr, length) {
    const out = new Array(length).fill(0);
    for (let i = 0; i < arr.length; i++) {
        out[i] = arr[i];
    }
    return out;
}

function fftshift(arr) {
    const half = Math.floor(arr.length / 2);
    return arr.slice(half).concat(arr.slice(0, half));
}

function complexMultiply(a, b) {
    const out = new Array(a.length);

    for (let i = 0; i < a.length; i += 2) {
        const ar = a[i], ai = a[i + 1];
        const br = b[i], bi = b[i + 1];

        out[i] = ar * br - ai * bi;      // real
        out[i + 1] = ar * bi + ai * br;  // imag
    }

    return out;
}

// ==========================
// Chart Setup
// ==========================
function createChart(ctx, label, color) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label,
                data: [],
                borderColor: color,
                backgroundColor: color + "33",
                fill: false,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: function(value) {
                            return Number(value).toFixed(2);
                        }
                    }
                },
                y: {
                    ticks: {
                        callback: function(value) {
                            return Number(value).toFixed(2);
                        }
                    }
                }
            }
        }
    });
}

function clearPreset(presetSelect) {
    presetSelect.value = "";
}

function generateFrequencyAxis(N, Fs = 1) {
    return Array.from({ length: N }, (_, i) =>
        (i - N / 2) * (Fs / N)
    );
}

// ==========================
// Main App Logic
// ==========================
document.addEventListener("DOMContentLoaded", () => {

    const presetSelect = document.getElementById("presetSelect-1d");
    const signalSelect = document.getElementById("signalSelect-1d");
    const kernelSelect = document.getElementById("kernelSelect-1d");
    const freqToggle = document.getElementById("freqToggle-1d");

    const inputChart = createChart(
        document.getElementById("inputChart-1d"),
        "Input",
        "#268529"   // green
    );

    const kernelChart = createChart(
        document.getElementById("kernelChart-1d"),
        "Kernel",
        "#057fe2"   // blue
    );

    const outputChart = createChart(
        document.getElementById("outputChart-1d"),
        "Output",
        "#BA68C8"   // purple
    );

    // ==========================
    // Populate Dropdowns
    // ==========================
    const signals = {
        "Mixed Signal (Multi-Frequency + Multi-Amplitude)": generateRichSignal,
        "Low Frequency Signal": generateLowFreq,
        "High Frequency Signal (Low Pass Demo)": generateHighFreq,
        "Mixed Signal (Multi-Frequency)": generateMixedSignal,
        "Impulse (Audio Effects)": generateImpulse
    };

    for (let key in signals) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key;
        signalSelect.appendChild(opt);
    }

    const kernelOptions = {
        "Smoothing": "smoothing",
        "Low Pass": "lowpass",
        "Echo": "echo",
        "Reverb": "reverb",
    };

    for (let key in kernelOptions) {
        const opt = document.createElement("option");
        opt.value = kernelOptions[key];
        opt.textContent = key;
        kernelSelect.appendChild(opt);
    }

    for (let key in presets) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key;
        presetSelect.appendChild(opt);
    }

    // ==========================
    // Update Function
    // ==========================
    function update() {
        const signalFunc = signals[signalSelect.value];
        let signal = signalFunc();

        let kernelKey = kernelSelect.value;
        let kernel = typeof kernels[kernelKey] === "function"
            ? kernels[kernelKey](signal.length)
            : kernels[kernelKey];

        if (!freqToggle.checked) {
            // Plot in time domain
            const output = convolve(signal, kernel);

            plot(inputChart, signal);
            plot(kernelChart, kernel);
            plot(outputChart, output);

        } else {
            const signalFFT = computeFFT(signal);
            const kernelFFT = computeFFT(pad(kernel, signal.length));

            // TRUE convolution theorem step
            const outputFFT = complexMultiply(signalFFT, kernelFFT);

            // magnitude only for visualization
            const signalMag = magnitude(fftshift(signalFFT));
            const kernelMag = magnitude(fftshift(kernelFFT));
            const outputMag = magnitude(fftshift(outputFFT));

            const freqAxis = generateFrequencyAxis(signal.length);

            plot(inputChart, signalMag, freqAxis);
            plot(kernelChart, kernelMag, freqAxis);
            plot(outputChart, outputMag, freqAxis);
        }
    }

    function plot(chart, data, labels = null) {
        chart.data.labels = labels ?? data.map((_, i) => i);
        chart.data.datasets[0].data = data;
        chart.update();
    }

    function updateExplanation() {
        const kernelKey = kernelSelect.value;
        const info = kernelDescriptions[kernelKey];

        if (!info) {
            document.getElementById("presetDescription").innerHTML = "";
            return;
        }

        document.getElementById("presetDescription").innerHTML = `
            <div><strong>${info.title}</strong></div>
            <div>${info.desc}</div>
            <ul>
                ${info.insights.map(i => `<li>${i}</li>`).join("")}
            </ul>
        `;
    }

    // ==========================
    // Events
    // ==========================
    signalSelect.addEventListener("change", update);
    kernelSelect.addEventListener("change", update);
    freqToggle.addEventListener("change", update);
    presetSelect.addEventListener("change", () => {
        const selected = presets[presetSelect.value];
        if (!selected) return;

        signalSelect.value = selected.signal;
        kernelSelect.value = selected.kernel;

        update();
    });

    signalSelect.addEventListener("change", () => {
        clearPreset(presetSelect);
        update();
        updateExplanation();
    });

    kernelSelect.addEventListener("change", () => {
        clearPreset(presetSelect);
        update();
        updateExplanation();
    });

    presetSelect.addEventListener("change", () => {
        const selected = presetSelect.value;

        if (!selected) {
            document.getElementById("presetDescription").innerHTML = "";
            update();
            updateExplanation();
            return;
        }

        const preset = presets[selected];
        signalSelect.value = preset.signal;
        kernelSelect.value = preset.kernel;

        update();
        updateExplanation();
    });

    update();
    updateExplanation();
});