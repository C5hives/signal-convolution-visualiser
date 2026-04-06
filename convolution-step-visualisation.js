// Drawing the visualisation
const canvas = document.getElementById("convolution-visualisation");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

function generateNoisySine(n, frequency = 0.15, noiseLevel = 0.4) {
    const signal = [];

    for (let i = 0; i < n; i++) {
        const sine = Math.sin(i * frequency * 2 * Math.PI);
        const noise = (Math.random() * 2 - 1) * noiseLevel;

        signal.push(sine + noise);
    }

    return signal;
}

function normalize(signal) {
    const max = Math.max(...signal.map(Math.abs));
    return signal.map(v => v / max);
}

const N = 15;
const SIGNAL = normalize(generateNoisySine(N));
const KERNEL = [1, 2, 3];

// Flip kernel for convolution
const FLIPPED_KERNEL = [...KERNEL].reverse();

let step = 0;
const maxSteps = SIGNAL.length + FLIPPED_KERNEL.length - 1;

let output = new Array(maxSteps).fill(null);

const padding = 60;
const barWidth = 35;
const spacing = 20;
const originY = canvas.height / 2;

const maxSignalValue = Math.max(...SIGNAL.map(Math.abs));
const scaleY = (canvas.height * 0.2) / maxSignalValue;

const topRegionY = canvas.height * 0.25;
const bottomRegionY = canvas.height * 0.75;

const regionHeight = 120;

const layout = {
    paddingTop: 40,
    paddingBottom: 40,
    gap: 20,
};

// Logic for visualisation controls
const playPauseBtn = document.getElementById("playPauseBtn");
const stepForwardBtn = document.getElementById("stepForwardBtn");
const stepBackBtn = document.getElementById("stepBackBtn");
const resetBtn = document.getElementById("resetBtn");
const stepScrubber = document.getElementById("stepScrubber");

stepScrubber.max = maxSteps - 1;
stepScrubber.value = 0;

let isPlaying = false;
let animationTimer = null;

// Play / Pause toggle
playPauseBtn.addEventListener("click", () => {
    isPlaying = !isPlaying;

    stepForwardBtn.disabled = isPlaying;
    stepBackBtn.disabled = isPlaying;

    if (isPlaying) {
        playPauseBtn.textContent = "⏸ Pause";
        animate();
    } else {
        playPauseBtn.textContent = "▶ Play";
        clearTimeout(animationTimer);
    }
});

// Step forward
stepForwardBtn.addEventListener("click", () => {
    clearTimeout(animationTimer);
    isPlaying = false;
    playPauseBtn.textContent = "▶ Play";

    if (step < maxSteps - 1) {
        step++;
        draw();
    }

    syncScrubber();
    updateButtonStates();
});

// Step backward
stepBackBtn.addEventListener("click", () => {
    clearTimeout(animationTimer);
    isPlaying = false;
    playPauseBtn.textContent = "▶ Play";

    if (step > 0) {
        step--;
        draw();
    }

    syncScrubber();
    updateButtonStates();
});

// Reset
resetBtn.addEventListener("click", () => {
    clearTimeout(animationTimer);
    isPlaying = false;
    playPauseBtn.textContent = "▶ Play";

    step = 0;
    syncScrubber();
    updateButtonStates();
    resetOutput();
    draw();
});

stepScrubber.addEventListener("input", (e) => {
    clearTimeout(animationTimer);
    isPlaying = false;
    playPauseBtn.textContent = "▶ Play";

    step = parseInt(e.target.value);
    updateButtonStates();
    draw();
});

function updateButtonStates() {
    stepBackBtn.disabled = (step === 0);
    stepForwardBtn.disabled = (step === maxSteps - 1);
}

function syncScrubber() {
    stepScrubber.value = step;
}

function resetOutput() {
    output = new Array(maxSteps).fill(null);
}

// Utility
function getX(i) {
    const paddingLeft = 50;
    const paddingRight = 150;

    const usableWidth = canvas.width - paddingLeft - paddingRight;
    const stepWidth = usableWidth / (SIGNAL.length - 1);

    return paddingLeft + i * stepWidth;
}

function getRegions() {
    const h = canvas.height;

    const regionHeight = (h - layout.paddingTop - layout.paddingBottom - 2 * layout.gap) / 10;

    return {
        signal: {
            top: layout.paddingTop,
            bottom: layout.paddingTop + 4 * regionHeight
        },
        kernel: {
            top: layout.paddingTop + 4 * regionHeight + layout.gap,
            bottom: layout.paddingTop + 5 * regionHeight + layout.gap
        },
        output: {
            top: layout.paddingTop + 5 * regionHeight + 2 * layout.gap,
            bottom: layout.paddingTop + 9 * regionHeight + 2 * layout.gap,
        },
        compute: {
            top: layout.paddingTop + 9 * regionHeight + 7 * layout.gap,
            bottom: h - layout.paddingBottom
        },
    };
}

function getRegionScale(region) {
    return (region.bottom - region.top) / 2;
}

function getSymmetricRange(signal) {
    let maxAbs = 0;

    for (const v of signal) {
        if (v === null || v === undefined) continue;
        maxAbs = Math.max(maxAbs, Math.abs(v));
    }

    return maxAbs;
}

function valueToY(val, region, maxAbs) {
    const height = region.bottom - region.top;
    const normalized = val / maxAbs;

    return region.bottom - (normalized * height / 2);
}

function drawSignalAxes() {
    const regions = getRegions();
    const region = regions.signal;

    const baseY = (region.top + region.bottom) / 2;
    const scaleY = getRegionScale(region);

    ctx.strokeStyle = "#aaa";
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";

    // Y-axis line
    ctx.beginPath();
    ctx.moveTo(40, region.top);
    ctx.lineTo(40, region.bottom);
    ctx.stroke();

    // X-axis baseline
    ctx.beginPath();
    ctx.moveTo(40, baseY);
    ctx.lineTo(canvas.width, baseY);
    ctx.stroke();

    // Y ticks
    const ticks = 4;
    const maxAbs = getSymmetricRange(SIGNAL);

    // symmetric range: [-maxAbs, +maxAbs]
    const stepVal = maxAbs / ticks;

    for (let i = -ticks; i <= ticks; i++) {
        const value = i * stepVal;

        // map value → pixel
        const y =
            baseY -
            (value / maxAbs) * scaleY;

        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(45, y);
        ctx.stroke();

        // ctx.fillText(value.toFixed(2), 5, y + 4);
    }

    // X ticks
    const stepSize = Math.floor(SIGNAL.length / 10);

    for (let i = 0; i < SIGNAL.length; i += stepSize) {
        const x = getX(i);

        ctx.beginPath();
        ctx.moveTo(x, baseY - 5);
        ctx.lineTo(x, baseY + 5);
        ctx.stroke();

        // ctx.fillText(i, x, baseY + 18);
    }
}

function drawOutputAxes() {
    const regions = getRegions();
    const region = regions.output;

    const baseY = (region.bottom + region.top) / 2;
    const scaleY = getRegionScale(region);

    ctx.strokeStyle = "#aaa";
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(40, region.top);
    ctx.lineTo(40, region.bottom);
    ctx.stroke();

    // X-axis baseline
    ctx.beginPath();
    ctx.moveTo(40, baseY);
    ctx.lineTo(canvas.width, baseY);
    ctx.stroke();

    // Y ticks
    const ticks = 4;
    const maxAbs = getSymmetricRange(output);

    // symmetric range: [-maxAbs, +maxAbs]
    const stepVal = maxAbs / ticks;

    for (let i = -ticks; i <= ticks; i++) {
        const value = i * stepVal;

        // map value → pixel
        const y =
            baseY -
            (value / maxAbs) * scaleY;

        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(45, y);
        ctx.stroke();
    }

    // X ticks (output length)
    const len = output.length;
    const stepSize = Math.floor(len / 10);

    for (let i = 0; i < len; i += stepSize) {
        const x = getX(i);

        ctx.beginPath();
        ctx.moveTo(x, baseY - 5);
        ctx.lineTo(x, baseY + 5);
        ctx.stroke();
    }
}

// Draw bar signal
function drawSignal(signal, offset = 0, color = "#4CAF50", highlight = []) {
    const regions = getRegions();
    const signal_region = regions.signal;
    const baseY = (signal_region.top + signal_region.bottom) / 2;
    const scaleY = (regions.signal.bottom - regions.signal.top) / 2;

    signal.forEach((val, i) => {
        const x = getX(i + offset) + 8;
        const height = val * scaleY;

        const isOverlap = highlight.includes(i + offset);

        ctx.fillStyle = isOverlap ? "#81C784" : color;

        ctx.fillRect(
            x,
            val >= 0 ? baseY - height : baseY,
            barWidth,
            Math.abs(height)
        );

        // value label
        ctx.fillStyle = "#000";
        ctx.fillText(val.toFixed(2), x + 4, baseY - height - 5);
    });
}

function drawOverlapWindow(overlapIndices) {
    if (overlapIndices.length === 0) return;

    const minIndex = Math.min(...overlapIndices);
    const maxIndex = Math.max(...overlapIndices);

    const xStart = getX(minIndex) + 8;
    const xEnd = getX(maxIndex) + barWidth + 8;

    ctx.fillStyle = "rgba(82, 82, 82, 0.08)";

    ctx.fillRect(
        xStart,
        0,
        xEnd - xStart,
        canvas.height
    );
}

function drawKernelWindow(offset, overlapIndices) {
    const region = getRegions().kernel;
    const baseY = (region.top + region.bottom) / 2 - 30;
    const height = 30;

    for (let i = 0; i < FLIPPED_KERNEL.length; i++) {
        const xIndex = i + offset;
        if (xIndex < 0) continue;
        
        const x = getX(xIndex) + 8;

        const val = FLIPPED_KERNEL[i];
        const isOverlap = overlapIndices.includes(xIndex);

        ctx.fillStyle = isOverlap ? "#64B5F6" : "#057fe2";

        ctx.fillRect(x, baseY, barWidth, height);

        // Value label
        ctx.fillStyle = "#fff";
        ctx.font = "14px monospace";
        ctx.fillText(val.toFixed(1), x + 5, baseY + 20);
    }
}

function drawOutputSignal() {
    const regions = getRegions();
    const baseY = (regions.output.bottom + regions.output.top) / 2;
    const scaleY = (regions.output.bottom - regions.output.top) / 12;

    ctx.strokeStyle = "#9C27B0";
    ctx.lineWidth = 2;

    ctx.beginPath();

    let started = false;

    for (let i = 0; i <= step; i++) {
        if (output[i] === null) continue;

        const x = getX(i) + 28;
        const y = baseY - output[i] * scaleY;

        if (!started) {
            ctx.moveTo(x, y);
            started = true;
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    ctx.lineTo(getX(step) + 28, baseY);
    ctx.lineTo(getX(0) + 28, baseY);
    ctx.closePath();

    ctx.fillStyle = "rgba(156, 39, 176, 0.1)";
    ctx.fill();

    // optional: draw points on top (makes it clearer)
    ctx.fillStyle = "#BA68C8";

    for (let i = 0; i <= step; i++) {
        if (output[i] === null) continue;

        const x = getX(i) + 28;
        const y = baseY - output[i] * scaleY;

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    const x = getX(step) + 28;
    const y = baseY - output[step] * scaleY;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff0000";
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";

    // draw values for each point in the graph
    for (let i = 0; i <= step; i++) {
        if (output[i] === null) continue;

        const x = getX(i) + 20;
        const y = baseY - output[i] * scaleY;

        ctx.fillText(
            output[i].toFixed(2),  // or Math.round(output[i])
            x + 5,                 // slight right offset
            y - 8                  // slightly above point
        );
    }
}

// Compute overlap + result
function computeStep() {
    let sum = 0;
    let terms = [];
    let overlapIndices = [];

    for (let i = 0; i < KERNEL.length; i++) {
        let signalIndex = step - i;

        if (signalIndex >= 0 && signalIndex < SIGNAL.length) {
            let s = SIGNAL[signalIndex];
            let k = KERNEL[i];
            let product = s * k;

            sum += product;

            terms.push({
                signal: s,
                kernel: k,
                product: product
            });

            overlapIndices.push(signalIndex);
        }
    }

    output[step] = sum;

    return { sum, terms, overlapIndices };
}

function drawBox(text, x, y, bgColor, textColor = "#fff") {
    ctx.font = "14px monospace";

    const paddingX = 6;
    const paddingY = 4;

    const metrics = ctx.measureText(text);
    const width = metrics.width + paddingX * 2;
    const height = 13 + paddingY * 2;

    // background
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y - 15, width, height);

    // text
    ctx.fillStyle = textColor;
    ctx.fillText(text, x + paddingX, y);

    return width;
}

function drawComputation(terms, sum) {
    const regions = getRegions();
    const region = regions.compute;

    const y = region.top + (region.bottom - region.top) / 2 - 8;
    let x = layout.paddingLeft || 10;

    ctx.font = "16px monospace";

    // Step label
    ctx.fillStyle = "#000";
    const prefix = `Step ${step}: `;
    ctx.fillText(prefix, x, y);
    x += ctx.measureText(prefix).width;

    terms.forEach((t, i) => {
        // "("
        ctx.fillStyle = "#000";
        ctx.fillText("(", x, y);
        x += ctx.measureText("(").width;

        // signal box (green)
        x += drawBox(
            t.signal.toFixed(2),
            x,
            y,
            "#81C784"
        );

        // multiply symbol
        ctx.fillStyle = "#000";
        ctx.fillText(" × ", x, y);
        x += ctx.measureText(" × ").width;

        // kernel box (blue)
        x += drawBox(
            t.kernel.toFixed(2),
            x,
            y,
            "#64B5F6"
        );

        // ")"
        ctx.fillStyle = "#000";
        ctx.fillText(")", x, y);
        x += ctx.measureText(")").width;

        if (i < terms.length - 1) {
            ctx.fillText(" + ", x, y);
            x += ctx.measureText(" + ").width;
        }
    });

    // equals
    ctx.fillStyle = "#000";
    ctx.fillText(" = ", x, y);
    x += ctx.measureText(" = ").width;

    // output box (purple)
    x += drawBox(
        sum.toFixed(2),
        x,
        y,
        "#BA68C8"
    );
}

// Main render
function draw() {
    console.log("DRAW step =", step);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // drawAxes();

    const { sum, terms, overlapIndices } = computeStep();
    const reversed_terms = terms.reverse();

    // Background overlap band
    drawOverlapWindow(overlapIndices);

    // Draw the signal part of the graph (top)
    drawSignalAxes();
    drawSignal(SIGNAL, 0, "#268529", overlapIndices);

    // Draw the kernel part of the graph (middle)
    drawKernelWindow(
        step - FLIPPED_KERNEL.length + 1,
        overlapIndices
    );
    

    // Draw the output part of the graph (bottom)
    drawOutputAxes();
    drawOutputSignal();

    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";

    const regions = getRegions()
    ctx.font = "bold 16px Arial";
    ctx.fillText("Input Signal + Kernel", 10, regions.signal.top - 17);

    ctx.font = "bold 16px Arial";
    ctx.fillText("Convolved Output", 10, regions.output.top - 17);

    drawComputation(reversed_terms, sum);
}

// Animation loop
function animate() {
    try {
        if (!isPlaying) return;

        draw();
        syncScrubber();

        animationTimer = setTimeout(() => {
            if (!isPlaying) return;

            step++;
            if (step >= maxSteps) step = 0;

            animate();
        }, 800);

    } catch (e) {
        console.error("Animation crashed:", e);
    }
}

draw(); // For initial rendering of the visualisation
updateButtonStates();
animate();