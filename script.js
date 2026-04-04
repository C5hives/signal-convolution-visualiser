function generateNoisySignal(n = 50) {
    let signal = [];
    for (let i = 0; i < n; i++) {
        let base = Math.sin(i * 0.3) * 2;
        let noise = (Math.random() - 0.5) * 1.5;
        signal.push(base + noise);
    }
    return signal;
}

function convolve(signal, kernel) {
    let output = [];
    let kHalf = Math.floor(kernel.length / 2);

    for (let i = 0; i < signal.length; i++) {
        let sum = 0;
        for (let j = 0; j < kernel.length; j++) {
            let idx = i + j - kHalf;
            if (idx >= 0 && idx < signal.length) {
                sum += signal[idx] * kernel[j];
            }
        }
        output.push(sum);
    }
    return output;
}

function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);

    // lock internal resolution to display size
    canvas.width = 800;
    canvas.height = 150;
}

const demoSignal = generateNoisySignal();
const demoKernel = [1, 1, 1];
const demoOutput = convolve(demoSignal, demoKernel);

function drawConvolutionWorkspace(canvasId, signal, kernel, centerIndex) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // -------------------------
    // LAYOUT CONSTANTS (FIXED)
    // -------------------------
    const paddingLeft = 40;
    const paddingRight = 10;

    const plotWidth = canvas.width - paddingLeft - paddingRight;
    const step = plotWidth / (signal.length - 1);

    // SIGNAL AREA (top ~60%)
    const signalTop = canvas.height * 0.05;
    const signalBottom = canvas.height * 0.75;

    const signalHeight = signalBottom - signalTop;
    const midY = signalTop + signalHeight / 2;

    // KERNEL AREA (tightly coupled under signal)
    const kernelGap = 10; // pixels (tune this)
    const kernelY = signalBottom + kernelGap;

    const boxHeight = 18;
    const kHalf = Math.floor(kernel.length / 2);

    // -------------------------
    // SCALE
    // -------------------------
    const maxVal = Math.max(...signal.map(v => Math.abs(v))) || 1;
    const scale = signalHeight / 2 / maxVal;

    // -------------------------
    // AXES
    // -------------------------
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;

    // zero axis
    ctx.beginPath();
    ctx.moveTo(paddingLeft, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    // vertical axis
    ctx.beginPath();
    ctx.moveTo(paddingLeft, signalTop);
    ctx.lineTo(paddingLeft, signalBottom);
    ctx.stroke();

    // -------------------------
    // Y TICKS (SYMMETRIC FIXED)
    // -------------------------
    const ticks = 3;

    ctx.fillStyle = "#666";
    ctx.font = "10px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = -ticks; i <= ticks; i++) {
        const value = (i / ticks) * maxVal;
        const y = midY - value * scale;

        ctx.beginPath();
        ctx.moveTo(paddingLeft - 4, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();

        ctx.fillText(value.toFixed(1), paddingLeft - 6, y);
    }

    // -------------------------
    // SIGNAL
    // -------------------------
    ctx.strokeStyle = "black";
    ctx.beginPath();

    for (let i = 0; i < signal.length; i++) {
        const x = paddingLeft + i * step;
        const y = midY - signal[i] * scale;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();

    // -------------------------
    // HIGHLIGHT WINDOW (UNCHANGED LOGIC, BETTER VISUAL INTEGRATION)
    // -------------------------
    const start = Math.max(0, centerIndex - kHalf);
    const end = Math.min(signal.length - 1, centerIndex + kHalf);

    const x = paddingLeft + start * step;
    const width = (end - start + 1) * step;

    ctx.fillStyle = "rgba(255,107,53,0.2)";
    ctx.fillRect(x, signalTop, width, signalHeight);

    // -------------------------
    // KERNEL (FIXED ALIGNMENT + TIGHT COUPLING)
    // -------------------------
    for (let j = 0; j < kernel.length; j++) {
        const idx = centerIndex + j - kHalf;
        if (idx < 0 || idx >= signal.length) continue;

        const xLeft = paddingLeft + idx * step;
        const xCenter = xLeft + step / 2;

        const val = kernel[j];

        // block
        ctx.fillStyle = idx === centerIndex ? "#e85d2a" : "#ff6b35";
        ctx.fillRect(xLeft, kernelY - boxHeight / 2, step, boxHeight);

        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.strokeRect(xLeft, kernelY - boxHeight / 2, step, boxHeight);

        // label (FIXED alignment)
        ctx.fillStyle = "#333";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillText(
            val.toFixed(0),
            xCenter,
            kernelY + boxHeight / 2 + 4
        );
    }

    // -------------------------
    // X TICKS
    // -------------------------
    ctx.strokeStyle = "rgba(0,0,0,0.2)";

    for (let i = 0; i < signal.length; i++) {
        const x = paddingLeft + i * step;

        ctx.beginPath();
        ctx.moveTo(x, midY - 6);
        ctx.lineTo(x, midY + 6);
        ctx.stroke();
    }
}

// -------------------------
// SIGNAL DRAWING
// -------------------------
function drawSignal(canvasId, data, highlightCenter = -1, kernelSize = 0, referenceLength = data.length) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paddingLeft = 40;
    const plotWidth = canvas.width - paddingLeft;
    const step = plotWidth / (referenceLength - 1);

    const validData = data.filter(v => v !== null && v !== undefined);
    let maxVal = Math.max(...validData.map(v => Math.abs(v))) || 1;
    let scale = (canvas.height / 2 - 10) / maxVal;

    const midY = canvas.height / 2;

    // Y axis
    ctx.strokeStyle = "#888";
    ctx.fillStyle = "#333";
    ctx.font = "10px Arial";

    const ticks = 5;
    for (let i = -ticks; i <= ticks; i++) {
        let yVal = (i / ticks) * maxVal;
        let y = midY - yVal * scale;

        ctx.beginPath();
        ctx.moveTo(paddingLeft - 5, y);
        ctx.lineTo(paddingLeft, y);
        ctx.stroke();

        ctx.fillText(yVal.toFixed(1), 5, y + 3);
    }

    ctx.beginPath();
    ctx.moveTo(paddingLeft, 0);
    ctx.lineTo(paddingLeft, canvas.height);
    ctx.stroke();

    // Signal line (FIXED: proper discontinuity handling)
    ctx.strokeStyle = "black";
    ctx.beginPath();

    let started = false;

    for (let i = 0; i < data.length; i++) {
        if (data[i] === null || data[i] === undefined) {
            started = false;
            continue;
        }

        let x = paddingLeft + i * step;
        let y = midY - data[i] * scale;

        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    // Highlight window
    if (highlightCenter !== -1) {
        const kHalf = Math.floor(kernelSize / 2);

        let start = Math.max(0, highlightCenter - kHalf);
        let end = Math.min(data.length - 1, highlightCenter + kHalf);

        let width = (end - start + 1) * step;
        let x = paddingLeft + start * step;

        ctx.fillStyle = "rgba(255,107,53,0.25)";
        ctx.fillRect(x, 0, width, canvas.height);
    }

    // Index ticks
    const tickHeight = 6;
    ctx.strokeStyle = "rgba(0,0,0,0.2)";

    for (let i = 0; i < data.length; i++) {
        let x = paddingLeft + i * step;

        ctx.beginPath();
        ctx.moveTo(x, midY - tickHeight);
        ctx.lineTo(x, midY + tickHeight);
        ctx.stroke();
    }

    // Baseline
    ctx.strokeStyle = "#aaa";
    ctx.beginPath();
    ctx.moveTo(paddingLeft, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();
}

// -------------------------
// MATH DISPLAY
// -------------------------
function updateMath(centerIndex) {
    let kHalf = Math.floor(demoKernel.length / 2);
    let terms = [];
    let sum = 0;

    for (let j = 0; j < demoKernel.length; j++) {
        let idx = centerIndex + j - kHalf;
        if (idx >= 0 && idx < demoSignal.length) {
            let val = demoSignal[idx];
            let rounded = Math.round(val * 100) / 100;
            let k = demoKernel[j];

            terms.push(`(${k.toFixed(2)} × ${rounded})`);
            sum += k * val;
        }
    }

    document.getElementById("mathBox").innerText =
        terms.join(" + ") + " = " + (Math.round(sum * 100) / 100);
}

// -------------------------
// ANIMATION
// -------------------------
let position = 0;
let speed = 0.02;

let smoothCenter = 0;
let smoothing = 0.12;

function animate() {
    // setupCanvas("convWorkspace");
    // setupCanvas("convOutput");

    let maxIndex = demoSignal.length - 1;

    // smooth motion
    smoothCenter += (position - smoothCenter) * smoothing;
    let centerIndex = Math.round(smoothCenter);

    // input and kernel
    drawConvolutionWorkspace("convWorkspace", demoSignal, demoKernel, centerIndex);

    // output (fixed axis)
    let visibleOutput = new Array(demoOutput.length).fill(null);
    for (let i = 0; i <= centerIndex; i++) {
        visibleOutput[i] = demoOutput[i];
    }

    drawSignal("convOutput", visibleOutput, -1, 0, demoSignal.length);

    // math
    updateMath(centerIndex);

    position += speed;
    if (position > maxIndex) position = 0;

    requestAnimationFrame(animate);
}

animate();

