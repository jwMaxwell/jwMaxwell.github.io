const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const params = {
  width: (canvas.width = window.innerWidth),
  height: (canvas.height = window.innerHeight),
  iterations: 50,
  antCount: 1,
  reset: 0,
};

const colors = ["blue", "teal", "cyan", "purple"];
const dirs = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];
const randInt = (range) => Math.floor(Math.random() * range);

let grid = [];
for (let i = 0; i < params.height; ++i) {
  grid[i] = new Array(params.width).fill(0);
}

let ants = new Array(params.antCount).fill({}).map((x) => {
  return {
    x: Math.floor(randInt(params.width) / 2),
    y: Math.floor(randInt(params.height) / 2),
    dir: Math.floor(Math.random() * dirs.length),
  };
});

const reset = () => {
  for (let i = 0; i < params.height; ++i) {
    grid[i] = new Array(params.width).fill(0);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log("done");
};

const loop = () => {
  for (let i = 0; i < params.iterations; ++i) {
    for (const ant of ants) {
      const [dx, dy] = dirs[ant.dir % dirs.length];
      ant.x = (ant.x + dx + params.width) % params.width;
      ant.y = (ant.y + dy + params.height) % params.height;

      const curPos = grid[ant.y][ant.x];
      ant.dir += curPos % 2 ? 1 : dirs.length;
      grid[ant.y][ant.x] = (curPos + 1) % colors.length;

      ctx.fillStyle = colors[curPos % colors.length];
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
          x: Math.floor(randInt(params.width) / 2),
          y: Math.floor(randInt(params.height) / 2),
          dir: Math.floor(Math.random() * dirs.length),
        };
      }))
  );
gui.add(params, "iterations", 1, 500).step(1);
gui.add({ reset: reset }, "reset");
