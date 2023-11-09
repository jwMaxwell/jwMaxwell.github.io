const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const width = (canvas.width = 300);
const height = (canvas.height = 270);

const imageData = ctx.createImageData(width, height);

const params = {
  outerRadius: 12,
  innerRadius: 3,
  upperThreshold: 0.46,
  lowerThreshold: 0.27,
  balance: 0.57,
  alpha: 0.42,
  beta: 2.7,
  gamma: 0.05,
  delta: 2,
};

let grid = new Float32Array(width * height);
const reset = () => {
  for (let i = 0; i < width * height; ++i) {
    grid[i] = Math.random();
  }
};
reset();

const kernelize = (arr) => {
  let sum = 0;
  for (let i = 0, len = arr.length; i < len; i++) {
    sum += grid[arr[i]];
  }
  return sum / arr.length;
};

const neighbors = new Array(width * height);
const getNeighbors = () => {
  for (let i = 0; i < width * height; ++i) {
    const centerX = i % width;
    const centerY = Math.floor(i / width);

    const inner = [];
    const outer = [];

    for (let dx = -params.outerRadius; dx <= params.outerRadius; dx++) {
      const dxSq = dx ** 2;
      for (let dy = -params.outerRadius; dy <= params.outerRadius; dy++) {
        const nx = (centerX + dx + width) % width;
        const ny = (centerY + dy + height) % height;
        const dist = Math.sqrt(dxSq + dy ** 2);

        if (dist <= params.innerRadius) {
          inner.push(ny * width + nx);
        } else if (dist <= params.outerRadius) {
          outer.push(ny * width + nx);
        }
      }
    }

    neighbors[i] = { inner, outer };
  }
};
getNeighbors();

const getKernels = (x, y) => {
  const n = neighbors[y * width + x];

  return {
    ui: kernelize(n.inner),
    uo: kernelize(n.outer),
  };
};

const life = (i, kernelUo, kernelUi) =>
  ((kernelUi >= params.balance &&
    kernelUo >= params.lowerThreshold - 0.01 &&
    kernelUo <= params.upperThreshold) ||
  (kernelUi < 1 - params.balance &&
    kernelUo >= params.lowerThreshold &&
    kernelUo <= params.upperThreshold - 0.1)
    ? 1
    : 0) *
  (params.alpha * kernelUo ** params.delta +
    params.beta * kernelUi +
    params.gamma);

const draw = () => {
  const imageData = ctx.createImageData(width, height);
  const buf = new ArrayBuffer(imageData.data.length);
  const buf8 = new Uint8ClampedArray(buf);
  const data = new Uint32Array(buf);

  for (let i = 0; i < grid.length; i++) {
    const kernels = getKernels(i % width, Math.floor(i / width));
    grid[i] = life(i, kernels.uo, kernels.ui);

    const color = (r, g, b, a = 255 * grid[i]) =>
      (a << 24) | (b << 16) | (g << 8) | r;

    data[i] = color(255, 255, 255);
  }

  buf8.set(new Uint8ClampedArray(data.buffer));
  imageData.data.set(buf8);
  ctx.putImageData(imageData, 0, 0);

  requestAnimationFrame(draw);
};

draw();

canvas.onclick = () => {
  reset();
  draw();
};

const gui = new window.dat.GUI();
gui.add(params, "outerRadius", 1, 16).step(1).onChange(getNeighbors);
gui.add(params, "innerRadius", 1, 16).step(1).onChange(getNeighbors);
gui.add(params, "balance", 0, 1).step(0.01);
gui.add(params, "alpha", 0, 5).step(0.01);
gui.add(params, "beta", 0, 5).step(0.01);
gui.add(params, "gamma", -2.5, 2.5).step(0.01);
gui.add(params, "delta", 0, 5).step(0.01);
gui.add(params, "lowerThreshold", 0.02, 1).step(0.01);
gui.add(params, "upperThreshold", 0.11, 1).step(0.01);
gui.add(
  {
    reset: reset,
  },
  "reset"
);

// sum e
