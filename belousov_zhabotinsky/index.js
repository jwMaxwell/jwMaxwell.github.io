const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

// Width, height of the image.
const width = (canvas.width = Math.floor(window.innerWidth / 5));
const height = (canvas.height = Math.floor(window.innerHeight / 5));

const imageData = ctx.createImageData(width, height);

const params = {
  alpha: 1.2,
  beta: 1,
  gamma: 1,
  delta: 0.5,
};

let grid = [];
const reset = () => {
  for (let i = 0; i < height; ++i) {
    grid[i] = new Array(width);
    for (let j = 0; j < grid[i].length; ++j) {
      grid[i][j] = [
        Math.random() + 0.3,
        Math.random() + 0.3,
        Math.random() + 0.3,
      ];
    }
  }
};

reset();

const getNeighbors = (grid, x, y) => {
  const neighbors = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const neighborX = (x + dx + height) % height;
      const neighborY = (y + dy + width) % width;

      neighbors.push(grid[neighborX][neighborY]);
    }
  }

  return neighbors;
};

const getAvg = (values) => {
  const A = values.map((t) => t[0]).reduce((acc, t) => acc + t) / values.length;
  const B = values.map((t) => t[1]).reduce((acc, t) => acc + t) / values.length;
  const C = values.map((t) => t[2]).reduce((acc, t) => acc + t) / values.length;

  return [A, B, C];
};

const limit = (value) => Math.max(0, Math.min(value, 1));

const loop = () => {
  for (let y = 0; y < grid.length; ++y) {
    for (let x = 0; x < grid[0].length; ++x) {
      const [A, B, C] = grid[y][x];

      grid[y][x][0] = limit(A + A * (params.alpha * B - params.gamma * C));
      grid[y][x][1] = limit(B + B * (params.beta * C - params.alpha * A));
      grid[y][x][2] = limit(C + C * (params.gamma * A - params.beta * B));

      if (grid[y][x].some((t) => t === 1 || t === 0))
        grid[y][x] = getAvg(getNeighbors(grid, y, x));

      const offset = (x + y * width) * 4;
      //imageData.data[offset] = 255 * grid[y][x][0];
      imageData.data[offset + 1] = 255 * grid[y][x][1];
      imageData.data[offset + 2] = 255 * grid[y][x][2];
      imageData.data[offset + 3] = 255; // Alpha
    }
  }

  ctx.putImageData(imageData, 0, 0);

  requestAnimationFrame(loop);
};

canvas.onclick = () => console.log(grid);

loop();

const gui = new window.dat.GUI();
gui.add(params, "alpha", 0, 5).step(0.1);
gui.add(params, "beta", 0, 5).step(0.1);
gui.add(params, "gamma", 0, 5).step(0.1);
gui.add(params, "delta", 0, 5).step(0.1);
gui.add(
  {
    reset: reset,
  },
  "reset"
);
