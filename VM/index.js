import { compress, decompress } from "./url-crunch.js";

const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const text = document.querySelector("pre");
const width = (canvas.width = Math.floor(window.innerWidth / 5));
const height = (canvas.height = Math.floor(window.innerHeight / 5));

let memory = new Float64Array(width * height + 1000);
const registers = {
  pc: 0,
  t0: 0,
  t1: 0,
  t2: 0,
  t3: 0,
  g0: 0,
  g1: 0,
  g2: 0,
  g3: 0,
  s0: 0,
  s1: 0,
  a0: 0,
  a1: 0,
  r0: 0,
  m0: width * height,
  z0: 0,
};

window.onload = () => {
  if (location.hash) {
    text.innerText = decompress(atob(location.hash.slice(1)));
  } else {
    text.innerText = `REG s0 ${width}      ; 0  width
REG s1 ${height}      ; 1  height`;
  }
};

const parse = (str) =>
  `${str}\n`
    .replace(/;(.*?)\n/g, "\n")
    .split("\n")
    .map((t) => t.match(/\S+/g))
    .filter((t) => t !== null);

const evaluate = (ast) => {
  // console.log(ast);
  const instructions = {
    REG: ([a, b]) => (registers[a] = Number(b)),
    SET: ([a, b]) => (memory[registers[a]] = registers[b]),
    GET: ([a, b]) => (registers[a] = memory[registers[b]]),
    MOV: ([a, b]) => (registers[a] = registers[b]),
    ADD: ([a, b, c]) => (registers[a] = registers[b] + registers[c]),
    SUB: ([a, b, c]) => (registers[a] = registers[b] - registers[c]),
    MUL: ([a, b, c]) => (registers[a] = registers[b] * registers[c]),
    DIV: ([a, b, c]) => (registers[a] = registers[b] / registers[c]),
    MOD: ([a, b, c]) => (registers[a] = registers[b] % registers[c]),
    SRL: ([a, b, c]) => (registers[a] = registers[b] >> registers[c]),
    SLL: ([a, b, c]) => (registers[a] = registers[b] << registers[c]),
    AND: ([a, b, c]) => (registers[a] = registers[b] & registers[c]),
    OR: ([a, b, c]) => (registers[a] = registers[b] | registers[c]),
    BEQ: ([a, b, c]) => {
      if (registers[a] === registers[b]) registers.pc = c - 1;
    },
    BNQ: ([a, b, c]) => {
      if (registers[a] !== registers[b]) registers.pc = c - 1;
    },
    BGT: ([a, b, c]) => {
      if (registers[a] > registers[b]) registers.pc = c - 1;
    },
    BLT: ([a, b, c]) => {
      if (registers[a] < registers[b]) registers.pc = c - 1;
    },
    JMP: ([a]) => (registers.pc = a - 1), //(registers.pc = registers[a]),
    END: () => {},
  };
  for (; registers.pc < ast.length; registers.pc++) {
    // console.log(`${registers.pc} -> ${ast.length}`);
    instructions[ast[registers.pc][0]](ast[registers.pc].slice(1));
    // console.log(registers.pc);
  }

  for (let i = 0; i < width * height - 1; i++) {
    ctx.fillStyle = memory[i] ? `#${memory[i].toString(16)}` : "black";
    const x = i % width;
    const y = Math.floor(i / width);
    ctx.fillRect(x, y, 1, 1);
  }
  registers.pc = 0;
  // console.log(ast);
};

const run = () => {
  try {
    evaluate(parse(text.innerText.trim()));
    location.hash = btoa(compress(text.innerText));
  } catch (e) {
    console.log(e);
  }
};

// ctx.fillStyle = `white`;
// ctx.fillRect(50, 50, 1, 1);
console.log(`w: ${width}, h: ${height}`);

const gui = new window.dat.GUI({ hideable: false });
gui.add(
  {
    "Clear Memory": () => {
      memory = new Float64Array(width * height + 1000);
      ctx.clearRect(0, 0, width, height);
    },
  },
  "Clear Memory"
);
gui.add(
  {
    Run: run,
  },
  "Run"
);
