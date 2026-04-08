// ==============================
// 2D CONVOLUTION SANDBOX (CLEAN REFAC)
// ==============================

(function () {
    const signalSize = 32;
    const imageSize = 128;

    // ==============================
    // STATE
    // ==============================

    const state = {
        mode: "signal", // "signal" | "image"
        inputKey: "square",
        kernelKey: "edge",
        presetKey: null,

        input: [],
        kernel: [],
        output: []
    };

    const kernelDescription = document.getElementById("kernelDescription-2d");

    let isApplyingPreset = false;

    // ==============================
    // OPTIONS (UI)
    // ==============================

    const signalOptions = {
        gradient: { label: "Gradient", type: "signal" },
        checkerboard: { label: "Checkerboard", type: "signal" },
        square: { label: "Square", type: "signal" },
        circle: { label: "Circle", type: "signal" },
        lines: { label: "Vertical Lines", type: "signal" }
    };

    const imageOptions = {
        chicory: { label: "Common Chicory", src: "img/cichorium-intybus.jpg" },
        oriole: { label: "Black-Naped Oriole", src: "img/black-naped-oriole.jpg" },
        professor: { label: "Associate Professor Ng", src: "img/associate-professor-ng.jpg" }
    };

    const kernelOptions = {
        blur: { 
            label: "Blurring",
            description: `
                The blur kernel averages neighbouring pixels, smoothing out sharp changes.
                This reduces noise and removes high-frequency details in the image.
            `
        },
        sharpen: { 
            label: "Sharpening",
            description: `
                The sharpen kernel emphasises differences between a pixel and its neighbours.
                This enhances edges and makes details appear more pronounced.
            `
        },
        edge: {
            label: "Edge Detection",
            description: `
                The edge detection kernel highlights regions where pixel values change rapidly.
                These large differences correspond to edges and boundaries in the image.
            `
        },
        gaussian: {
            label: "Gaussian Blur",
            description: `
                A smoother blur than box blur.
                It weighs center pixels more heavily, producing more natural smoothing.
            `
        },
        sobel: {
            label: "Sobel Filter",
            description: `
                Detects edges using gradient approximation.
                The current sobel filter kernel highlights vertical intensity changes, but can also be configured for horizontal edges.
            `
        },
        emboss: {
            label: "Embossing",
            description: `
                Creates a 3D relief effect by emphasizing directional intensity changes.
                Produces the illusion of a raised surface.
            `
        }
    };

    const presets2D = {
        edgeSquare: { label: "Edge Detection (Square)", signal: "square", kernel: "edge" },
        blurChecker: { label: "Blurring (Checkerboard)", signal: "checkerboard", kernel: "blur" },
        sharpenGradient: { label: "Sharpening (Gradient)", signal: "gradient", kernel: "sharpen" },
        gaussianImage: { label: "Gaussian Blur (Image)", signal: "oriole", kernel: "gaussian" },
        sobelLines: { label: "Sobel Edge Detection (Lines)", signal: "lines", kernel: "sobel" },
        embossCircle: { label: "Emboss (Circle)", signal: "circle", kernel: "emboss" }
    };

    // ==============================
    // KERNELS (math)
    // ==============================

    const kernels = {
        blur: [[1/9,1/9,1/9],[1/9,1/9,1/9],[1/9,1/9,1/9]],
        sharpen: [[0,-1,0],[-1,5,-1],[0,-1,0]],
        edge: [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]],
        gaussian: [[1,2,1],[2,4,2],[1,2,1]].map(r => r.map(v => v / 16)),
        sobel: [[-1,0,1],[-2,0,2],[-2,0,2]],
        emboss: [[-2,-1,0],[-1,1,1],[0,1,2]]
    };

    // ==============================
    // CANVAS
    // ==============================

    const inputCanvas = document.getElementById("inputCanvas-2d");
    const kernelCanvas = document.getElementById("kernelCanvas-2d");
    const outputCanvas = document.getElementById("outputCanvas-2d");

    const inputCtx = inputCanvas.getContext("2d");
    const kernelCtx = kernelCanvas.getContext("2d");
    const outputCtx = outputCanvas.getContext("2d");

    function fitCanvas(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return ctx;
    }

    // ==============================
    // UTILS
    // ==============================

    const emptyMatrix = (h, w) =>
        Array.from({ length: h }, () => Array(w).fill(0));

    function normalize(mat) {
        let min = Infinity, max = -Infinity;
        for (const row of mat) {
            for (const v of row) {
                min = Math.min(min, v);
                max = Math.max(max, v);
            }
        }
        return mat.map(row =>
            row.map(v => (v - min) / (max - min || 1))
        );
    }

    function drawMatrix(ctx, mat) {
        const rect = ctx.canvas.getBoundingClientRect();
        const h = mat.length, w = mat[0].length;

        const cw = rect.width / w;
        const ch = rect.height / h;

        const n = normalize(mat);

        ctx.clearRect(0, 0, rect.width, rect.height);

        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {

                const g = Math.floor(n[i][j] * 255);
                ctx.fillStyle = `rgb(${g},${g},${g})`;

                const x = Math.floor(j * cw);
                const y = Math.floor(i * ch);
                const w2 = Math.ceil((j + 1) * cw) - x;
                const h2 = Math.ceil((i + 1) * ch) - y;

                ctx.fillRect(x, y, w2, h2);
            }
        }
    }

    // ==============================
    // GENERATORS
    // ==============================

    function generateInput(type, size) {
        const m = emptyMatrix(size, size);
        const c = size / 2;

        if (type === "square") {
            for (let i = 0; i < size; i++)
                for (let j = 0; j < size; j++)
                    m[i][j] =
                        (i > size * 0.25 && i < size * 0.75 &&
                         j > size * 0.25 && j < size * 0.75) ? 1 : 0;
        }

        if (type === "circle") {
            const r = size / 4;
            for (let i = 0; i < size; i++)
                for (let j = 0; j < size; j++)
                    m[i][j] = Math.hypot(i - c, j - c) < r ? 1 : 0;
        }

        if (type === "checkerboard") {
            for (let i = 0; i < size; i++)
                for (let j = 0; j < size; j++)
                    m[i][j] = (Math.floor(i / 4) + Math.floor(j / 4)) % 2;
        }

        if (type === "gradient") {
            for (let i = 0; i < size; i++)
                for (let j = 0; j < size; j++)
                    m[i][j] = i;
        }

        if (type === "lines") {
            for (let i = 0; i < size; i++)
                for (let j = 0; j < size; j++)
                    m[i][j] = (j % 6 < 3) ? 1 : 0;
        }

        return m;
    }

    function imageToMatrix(img, size) {
        const c = document.createElement("canvas");
        c.width = c.height = size;

        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);

        const data = ctx.getImageData(0, 0, size, size).data;
        const m = emptyMatrix(size, size);

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const k = (i * size + j) * 4;
                m[i][j] = (data[k] + data[k+1] + data[k+2]) / 3 / 255;
            }
        }

        return m;
    }

    // ==============================
    // CONVOLUTION
    // ==============================

    function convolve2D(input, kernel) {
        const h = input.length, w = input[0].length;
        const kh = kernel.length, kw = kernel[0].length;
        const ph = Math.floor(kh / 2), pw = Math.floor(kw / 2);

        const out = emptyMatrix(h, w);

        for (let i = 0; i < h; i++) {
            for (let j = 0; j < w; j++) {
                let sum = 0;

                for (let ki = 0; ki < kh; ki++) {
                    for (let kj = 0; kj < kw; kj++) {
                        const ii = i + ki - ph;
                        const jj = j + kj - pw;

                        if (ii >= 0 && jj >= 0 && ii < h && jj < w) {
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
    // CORE UPDATE
    // ==============================

    function update() {
        state.output = convolve2D(state.input, state.kernel);

        drawMatrix(inputCtx, state.input);
        drawMatrix(kernelCtx, state.kernel);
        drawMatrix(outputCtx, state.output);

        updateKernelDescription(); 
    }

    // ==============================
    // SETTERS
    // ==============================

    function setInputFromSignal(key) {
        state.mode = "signal";
        state.inputKey = key;
        state.input = generateInput(key, signalSize);
        update();
    }

    function setInputFromImage(key) {
        state.mode = "image";
        state.inputKey = key;

        const img = new Image();
        img.onload = () => {
            state.input = imageToMatrix(img, imageSize);
            update();
        };

        img.src = imageOptions[key].src;
    }

    function setKernel(key) {
        state.kernelKey = key;
        state.kernel = kernels[key];
        update();
    }

    function applyPreset(key) {
        const p = presets2D[key];
        if (!p) return;

        isApplyingPreset = true;
        state.presetKey = key;

        setKernel(p.kernel);

        if (signalOptions[p.signal]) {
            setInputFromSignal(p.signal);
        } else {
            setInputFromImage(p.signal);
        }

        isApplyingPreset = false;
    }

    // ==============================
    // POPULATE UI
    // ==============================

    function populateSignal(select) {
        select.innerHTML = "";

        for (const key in signalOptions) {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = signalOptions[key].label;
            select.appendChild(opt);
        }

        for (const key in imageOptions) {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = imageOptions[key].label;
            select.appendChild(opt);
        }
    }

    function populateKernel(select) {
        select.innerHTML = "";

        for (const key in kernelOptions) {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = kernelOptions[key].label;
            opt.title = kernelOptions[key].description;
            select.appendChild(opt);
        }
    }

    function populatePresets(select) {
        select.innerHTML = "";

        for (const key in presets2D) {
            const opt = document.createElement("option");
            opt.value = key;
            opt.textContent = presets2D[key].label;
            select.appendChild(opt);
        }
    }

    function updateKernelDescription() {
        const key = state.kernelKey;
        if (!key || !kernelOptions[key]) {
            kernelDescription.textContent = "";
            return;
        }

        kernelDescription.innerHTML = `<strong>${kernelOptions[key].label}:</strong> ${kernelOptions[key].description}`;
    }

    // ==============================
    // INIT
    // ==============================

    function init() {
        fitCanvas(inputCanvas);
        fitCanvas(kernelCanvas);
        fitCanvas(outputCanvas);

        const signalSelect = document.getElementById("signalSelect-2d");
        const kernelSelect = document.getElementById("kernelSelect-2d");
        const presetSelect = document.getElementById("presetSelect-2d");
        const imageUpload = document.getElementById("imageUpload-2d");

        populateSignal(signalSelect);
        populateKernel(kernelSelect);
        populatePresets(presetSelect);

        // initial state
        state.input = generateInput("square", signalSize);
        state.kernel = kernels.edge;

        signalSelect.value = "square";
        kernelSelect.value = "edge";

        update();

        signalSelect.onchange = e => {
            if (isApplyingPreset) return;
            const v = e.target.value;

            if (signalOptions[v]) setInputFromSignal(v);
            else setInputFromImage(v);
        };

        kernelSelect.onchange = e => {
            if (isApplyingPreset) return;
            setKernel(e.target.value);
        };

        presetSelect.onchange = e => applyPreset(e.target.value);

        imageUpload.onchange = async (e) => {
            if (!e.target.files || !e.target.files[0]) return;
            const file = e.target.files[0];
            if (!file) return;

            const bitmap = await createImageBitmap(file);

            const canvas = document.createElement("canvas");
            canvas.width = imageSize;
            canvas.height = imageSize;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(bitmap, 0, 0, imageSize, imageSize);

            const data = ctx.getImageData(0, 0, imageSize, imageSize).data;

            const m = emptyMatrix(imageSize, imageSize);

            for (let i = 0; i < imageSize; i++) {
                for (let j = 0; j < imageSize; j++) {
                    const k = (i * imageSize + j) * 4;
                    m[i][j] = (data[k] + data[k+1] + data[k+2]) / 3 / 255;
                }
            }

            state.mode = "image";
            state.inputKey = "uploaded";
            state.input = m;

            update();
        };
    }

    init();

})();