const signalOptions = {
    gradient: { label: "Gradient", type: "signal" },
    checkerboard: { label: "Checkerboard", type: "signal" },
    square: { label: "Square", type: "signal" },
    circle: { label: "Circle", type: "signal" },
    lines: { label: "Vertical Lines", type: "signal" }
};

const imageOptions = {
    chicory: { label: "Common Chicory", src: "img/cichorium-intybus.jpg", type: "image" },
    oriole: { label: "Black-Naped Oriole", src: "img/black-naped-oriole.jpg", type: "image" },
    professor: { label: "Associate Professor Ng", src: "img/associate-professor-ng.jpg", type: "image" },
};

const kernelOptions = {
    blur: {
        label: "Blur",
        description: `
            The blur kernel averages neighbouring pixels, smoothing out sharp changes.
            This reduces noise and removes high-frequency details in the image.
        `,
        type: "signal"
    },

    sharpen: {
        label: "Sharpen",
        description: `
            The sharpen kernel emphasises differences between a pixel and its neighbours.
            This enhances edges and makes details appear more pronounced.
        `,
        type: "signal"
    },

    edge: {
        label: "Edge Detect",
        description: `
            The edge detection kernel highlights regions where pixel values change rapidly.
            These large differences correspond to edges and boundaries in the image.
        `,
        type: "signal"
    },

    gaussian: {
        label: "Gaussian Blur",
        description: `
            A smoother blur than box blur.
            It weights center pixels more heavily, producing more natural smoothing.
        `,
        type: "signal"
    },

    sobel: {
        label: "Sobel (Edge Detection)",
        description: `
            Detects edges using gradient approximation.
            Highlights horizontal and vertical intensity changes.
        `,
        type: "signal"
    },

    emboss: {
        label: "Emboss",
        description: `
            Creates a 3D relief effect by emphasizing directional intensity changes.
            Produces the illusion of a raised surface.
        `,
        type: "signal"
    }
};

const presets2D = {
    edgeSquare: {
        label: "Edge Detection (Square)",
        signal: "square",
        kernel: "edge"
    },

    blurChecker: {
        label: "Blurring (Checkerboard)",
        signal: "checkerboard",
        kernel: "blur"
    },

    sharpenGradient: {
        label: "Sharpening (Gradient)",
        signal: "gradient",
        kernel: "sharpen"
    },
    gaussianImage: {
        label: "Gaussian Blur (Image)",
        signal: "oriole",
        kernel: "gaussian"
    },
    sobelLines: {
        label: "Sobel Edge Detection (Lines)",
        signal: "lines",
        kernel: "sobel"
    },
    embossCircle: {
        label: "Emboss (Circle)",
        signal: "circle",
        kernel: "emboss"
    }
};

// ==============================
// 2D CONVOLUTION SANDBOX
// ==============================

(function () {

    const signalSize = 32;
    const imageSize = 128;

    let input = [];
    let kernel = [];
    let output = [];

    let inputMode = "signal"; // "signal" | "image"
    let inputImage = null;

    const kernels = {
        blur: [
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9],
            [1/9, 1/9, 1/9]
        ],

        sharpen: [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0]
        ],

        edge: [
            [-1, -1, -1],
            [-1, 8, -1],
            [-1, -1, -1]
        ],

        gaussian: [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ].map(row => row.map(v => v / 16)),

        sobel: [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ],

        emboss: [
            [-2, -1, 0],
            [-1, 1, 1],
            [0, 1, 2]
        ]
    };

    // Canvas elements
    const inputCanvas = document.getElementById("inputCanvas-2d");
    const kernelCanvas = document.getElementById("kernelCanvas-2d");
    const outputCanvas = document.getElementById("outputCanvas-2d");

    const inputCtx = inputCanvas?.getContext("2d");
    const kernelCtx = kernelCanvas?.getContext("2d");
    const outputCtx = outputCanvas?.getContext("2d");

    // ==============================
    // UTILITIES
    // ==============================

    function createEmptyMatrix(h, w) {
        return Array.from({ length: h }, () => Array(w).fill(0));
    }

    function normalize(matrix) {
        let min = Infinity, max = -Infinity;

        matrix.forEach(row => {
            row.forEach(v => {
                min = Math.min(min, v);
                max = Math.max(max, v);
            });
        });

        return matrix.map(row =>
            row.map(v => (v - min) / (max - min || 1))
        );
    }

    function drawMatrix(ctx, matrix) {
        if (!ctx) return;

        const h = matrix.length;
        const w = matrix[0].length;

        const cellW = ctx.canvas.width / w;
        const cellH = ctx.canvas.height / h;

        const norm = normalize(matrix);

        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                const val = norm[i][j];
                const gray = Math.floor(val * 255);
                ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                ctx.fillRect(j * cellW, i * cellH, cellW, cellH);
            }
        }
    }

    function populateKernelSelect(selectEl, options) {
        if (!selectEl) return;
        
        selectEl.innerHTML = "";
        
        Object.entries(options).forEach(([value, obj]) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = obj.label;
            selectEl.appendChild(opt);
        });
    }

    function populateSignalInputSelect(selectEl) {
        if (!selectEl) return;

        selectEl.innerHTML = "";

        const signalGroup = document.createElement("optgroup");
        signalGroup.label = "Generated Signals";

        Object.entries(signalOptions).forEach(([key, obj]) => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = obj.label;
            signalGroup.appendChild(opt);
        });

        const imageGroup = document.createElement("optgroup");
        imageGroup.label = "Images";

        Object.entries(imageOptions).forEach(([key, obj]) => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = obj.label;
            imageGroup.appendChild(opt);
        });

        selectEl.appendChild(signalGroup);
        selectEl.appendChild(imageGroup);
    }

    function updateKernelDescription(kernelKey) {
        const descBox = document.getElementById("presetDescription-2d");
        if (!descBox) return;

        const kernelInfo = kernelOptions[kernelKey];

        descBox.innerHTML = `
            <strong>Kernel:</strong> ${kernelInfo.label}
            <br><br>
            ${kernelInfo.description.trim()}
        `;
    }

    function applyPreset(key) {
        const preset = presets2D[key];
        if (!preset) return;

        const signalSelect = document.getElementById("signalSelect-2d");
        const kernelSelect = document.getElementById("kernelSelect-2d");

        kernelSelect.value = preset.kernel;
        kernel = kernels[preset.kernel];
        updateKernelDescription(preset.kernel);

        const inputKey = preset.signal;
        const signal = signalOptions[inputKey];
        const image = imageOptions[inputKey];

        // =========================
        // CASE 1: Generated signal
        // =========================
        if (signal?.type === "signal") {
            inputMode = "signal";

            signalSelect.value = inputKey;

            input = generateInput(inputKey, signalSize);
            update();
            return;
        }

        // =========================
        // CASE 2: Image input
        // =========================
        if (image?.type === "image") {
            inputMode = "image";

            signalSelect.value = inputKey;

            const img = new Image();

            img.onload = () => {
                input = imageToMatrix(img, imageSize);
                update();
            };

            img.src = image.src;
            return;
        }

        // =========================
        // fallback safety
        // =========================
        console.warn("Unknown preset input:", inputKey);
    }

    function populatePresets(selectEl, presets) {
        if (!selectEl) return;

        selectEl.innerHTML = '<option value="">-- Select a preset --</option>';

        Object.entries(presets).forEach(([key, preset]) => {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = preset.label;
            selectEl.appendChild(opt);
        });
    }

    function setupCanvas(ctx) {
        ctx.imageSmoothingEnabled = false;
    }

    function imageToMatrix(img, size = 32) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = size;
        canvas.height = size;

        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(img, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;

        let mat = createEmptyMatrix(size, size);

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const idx = (i * size + j) * 4;

                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];

                mat[i][j] = (r + g + b) / 3; // grayscale
            }
        }

        return mat;
    }

    // ==============================
    // SIGNAL GENERATION
    // ==============================

    function generateInput(type = "gradient", size = 32) {
        let mat = createEmptyMatrix(size, size);

        const cx = size / 2;
        const cy = size / 2;

        if (type === "gradient") {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    mat[i][j] = i; // vertical gradient
                }
            }
        }

        if (type === "checkerboard") {
            const block = 4;
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    mat[i][j] = ((Math.floor(i / block) + Math.floor(j / block)) % 2);
                }
            }
        }

        if (type === "square") {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    mat[i][j] =
                        (i > size * 0.25 && i < size * 0.75 &&
                        j > size * 0.25 && j < size * 0.75) ? 1 : 0;
                }
            }
        }

        if (type === "circle") {
            const r = size / 4;
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    const d = Math.sqrt((i - cx) ** 2 + (j - cy) ** 2);
                    mat[i][j] = d < r ? 1 : 0;
                }
            }
        }

        if (type === "lines") {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    mat[i][j] = (j % 6 < 3) ? 1 : 0;
                }
            }
        }

        return mat;
    }

    // ==============================
    // CONVOLUTION
    // ==============================

    function convolve2D(input, kernel) {
        const h = input.length;
        const w = input[0].length;

        const kh = kernel.length;
        const kw = kernel[0].length;

        const padH = Math.floor(kh / 2);
        const padW = Math.floor(kw / 2);

        let out = createEmptyMatrix(h, w);

        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {

                let sum = 0;

                for (let ki = 0; ki < kh; ki++) {
                    for (let kj = 0; kj < kw; kj++) {

                        const ii = i + ki - padH;
                        const jj = j + kj - padW;

                        if (ii >= 0 && ii < h && jj >= 0 && jj < w) {
                            sum += input[ii][jj] * kernel[ki][kj];
                        }
                    }
                }

                out[i][j] = sum;
            }
        }

        return out;
    }

    // ==============================
    // INITIALISE
    // ==============================

    function update() {
        output = convolve2D(input, kernel);

        drawMatrix(inputCtx, input);
        drawMatrix(kernelCtx, kernel);
        drawMatrix(outputCtx, output);
    }

    function init() {
        setupCanvas(inputCtx);
        setupCanvas(kernelCtx);
        setupCanvas(outputCtx);

        const signalSelect = document.getElementById("signalSelect-2d");
        const kernelSelect = document.getElementById("kernelSelect-2d");
        const presetSelect = document.getElementById("presetSelect-2d");
        const imageUpload = document.getElementById("imageUpload-2d");

        // Populate dropdowns
        populateSignalInputSelect(signalSelect);
        populateKernelSelect(kernelSelect, kernelOptions);
        populatePresets(presetSelect, presets2D);

        // Default selections
        signalSelect.value = "square";
        kernelSelect.value = "edge";
        presetSelect.value = "edgeSquare";

        input = generateInput(signalSelect.value);
        kernel = kernels[kernelSelect.value];

        updateKernelDescription(kernelSelect.value);
        update();

        // ======================
        // LISTENERS
        // ======================

        signalSelect.addEventListener("change", () => {
            const key = signalSelect.value;

            presetSelect.value = "";
            imageUpload.value = "";

            const signal = signalOptions[key];
            const image = imageOptions[key];

            // SAFETY: if nothing matches, do nothing
            if (!signal && !image) return;

            if (signal?.type === "signal") {
                inputMode = "signal";
                input = generateInput(key, signalSize);
                update();
                return;
            }

            if (image?.type === "image") {
                inputMode = "image";

                const img = new Image();

                img.onload = () => {
                    input = imageToMatrix(img, imageSize);
                    update();
                };

                img.src = image.src;
                return;
            }
        });

        kernelSelect.addEventListener("change", () => {
            presetSelect.value = "";

            kernel = kernels[kernelSelect.value];
            updateKernelDescription(kernelSelect.value);
            update();
        });

        presetSelect.addEventListener("change", (e) => {
            applyPreset(e.target.value);
        });

        imageUpload.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const img = new Image();
            img.onload = () => {
                inputMode = "image";
                inputImage = img;

                const signalSelect = document.getElementById("signalSelect-2d");
                const presetSelect = document.getElementById("presetSelect-2d");

                signalSelect.value = "";
                presetSelect.value = "";

                input = imageToMatrix(img, imageSize);
                update();
            };

            img.src = URL.createObjectURL(file);
        });
    }

    init();

})();