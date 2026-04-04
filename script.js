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

const demoSignal = generateNoisySignal();
const demoKernel = [1, 1, 1];
const demoOutput = convolve(demoSignal, demoKernel);

function drawConvolutionWorkspace(canvasId, signal, kernel, centerIndex) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paddingLeft = 40;
    const plotWidth = canvas.width - paddingLeft;
    const step = plotWidth / (signal.length - 1);

    const midY = canvas.height * 0.35;     // SIGNAL AREA
    const kernelY = canvas.height * 0.75;   // KERNEL AREA

    const boxHeight = 18;
    const kHalf = Math.floor(kernel.length / 2);

    // -------------------------
    // TITLE
    // -------------------------
    ctx.fillStyle = "#444";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Convolution: signal + sliding kernel", 10, 5);

    // -------------------------
    // SIGNAL SCALE
    // -------------------------
    let maxVal = Math.max(...signal.map(v => Math.abs(v))) || 1;
    let scale = (canvas.height * 0.25) / maxVal;

    // -------------------------
    // SIGNAL AXIS
    // -------------------------
    ctx.strokeStyle = "#aaa";
    ctx.beginPath();
    ctx.moveTo(paddingLeft, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    // -------------------------
    // SIGNAL LINE
    // -------------------------
    ctx.strokeStyle = "black";
    ctx.beginPath();

    for (let i = 0; i < signal.length; i++) {
        let x = paddingLeft + i * step;
        let y = midY - signal[i] * scale;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();

    // -------------------------
    // HIGHLIGHT WINDOW (signal region)
    // -------------------------
    let start = Math.max(0, centerIndex - kHalf);
    let end = Math.min(signal.length - 1, centerIndex + kHalf);

    let x = paddingLeft + start * step;
    let width = (end - start + 1) * step;

    ctx.fillStyle = "rgba(255,107,53,0.2)";
    ctx.fillRect(x, midY - canvas.height * 0.2, width, canvas.height * 0.4);

    // -------------------------
    // KERNEL LABEL
    // -------------------------
    ctx.fillStyle = "#555";
    ctx.font = "bold 12px Arial";
    ctx.fillText("Kernel (sliding window)", 10, canvas.height * 0.55);

    // -------------------------
    // KERNEL ROW (NO OVERLAP WITH SIGNAL)
    // -------------------------
    for (let j = 0; j < kernel.length; j++) {
        let idx = centerIndex + j - kHalf;
        if (idx < 0 || idx >= signal.length) continue;

        let xLeft = paddingLeft + idx * step;
        let xCenter = xLeft + step / 2;

        let val = kernel[j];

        ctx.fillStyle = idx === centerIndex ? "#e85d2a" : "#ff6b35";

        ctx.fillRect(xLeft, kernelY - boxHeight / 2, step, boxHeight);

        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.strokeRect(xLeft, kernelY - boxHeight / 2, step, boxHeight);

        ctx.fillStyle = "#333";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        ctx.fillText(
            val.toFixed(1),
            xCenter,
            kernelY + boxHeight / 2 + 4
        );
    }

    // -------------------------
    // KERNEL BASELINE (optional visual structure)
    // -------------------------
    ctx.strokeStyle = "#ddd";
    ctx.beginPath();
    ctx.moveTo(paddingLeft, kernelY);
    ctx.lineTo(canvas.width, kernelY);
    ctx.stroke();
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

