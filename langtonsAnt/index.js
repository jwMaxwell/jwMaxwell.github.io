const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const width = (canvas.width = window.innerWidth);
const height = (canvas.height = window.innerHeight);

const colorArr = ["blue", "teal", "cyan", "purple", "green", "red", "orange"];
const params = {
  iterations: 50,
  antCount: 1,
  colors: colorArr.length,
};

const randInt = (range) => Math.floor(Math.random() * range);

let grid = [];
for (let i = 0; i < height; ++i) {
  grid[i] = new Array(width).fill(0);
}

let dirs = [
  // [1, 0], // east
  [1, 1], // south east
  [0, 1], // south
  [-1, 1], // south west
  // [-1, 0], // west
  [-1, -1], // north west
  [0, -1], // north
  [1, -1], // north east
];

let ants = new Array(params.antCount).fill({}).map((x) => {
  return {
    x: Math.floor(randInt(width) / 2),
    y: Math.floor(randInt(height) / 2),
    dir: 1,
  };
});

const reset = () => {
  for (let i = 0; i < height; ++i) {
    grid[i] = new Array(width).fill(0);
  }
  for (const ant of ants) ant.dir = 1;
  ctx.clearRect(0, 0, width, canvas.height);
};

const loop = () => {
  for (let i = 0; i < params.iterations; ++i) {
    for (const ant of ants) {
      const [dx, dy] = dirs[ant.dir % dirs.length];
      ant.x = (ant.x + dx + width) % width;
      ant.y = (ant.y + dy + height) % height;

      const curPos = grid[ant.y][ant.x];
      ant.dir += curPos % 2 ? 1 : dirs.length;
      grid[ant.y][ant.x] = (curPos + 1) % params.colors;

      ctx.fillStyle = colorArr[curPos % params.colors];
      ctx.fillRect(ant.x, ant.y, 1, 1);
    }
  }
  requestAnimationFrame(loop);
};

loop();

const gui = new window.dat.GUI();
gui
  .add(params, "antCount", 1, 10)
  .step(1)
  .onChange(
    () =>
      (ants = new Array(params.antCount).fill({}).map((x) => {
        return {
          x: Math.floor(randInt(width) / 2),
          y: Math.floor(randInt(height) / 2),
          dir: Math.floor(Math.random() * dirs.length),
        };
      }))
  );
gui.add(params, "iterations", 1, 500).step(1);
gui.add(params, "colors", 2, colorArr.length).step(1);
gui.add({ reset: reset }, "reset");
