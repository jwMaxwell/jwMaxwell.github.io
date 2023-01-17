const escapeChars = (str) => {
  return str
    .replace(/\\s/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
};

const toBin = (x, padding) => parseInt(x).toString(2).padStart(padding, "0");

const instructions = {
  STORE: (addr, x) => `01000000 ${toBin(addr, 8)} ${toBin(x, 16)}}`,
  PUSH: (x) => {
    if (x.includes('"')) {
      let res = "";
      const str = x.slice(1, -1).split("");
      for (const c of str) res += `01110000 ${toBin(c.charCodeAt(0), 24)}\n`;
      res += "01110000 00000000 00000000 00000000";
      return res;
    }
    return `01110000 ${toBin(x, 24)}`;
  },
  MOVE: (x, y) => `01010000 00000000 ${toBin(x, 8)} ${toBin(y, 8)}`,
  POP: (x) => {
    const str = "10000000 00000000 00000000 00000000";
    return isNaN(parseInt(x)) ? str : str.repeat(x);
  },
  MATH: (op, x, y) => {
    const operators = {
      "+": "00100000",
      "-": "00100001",
      "*": "00100010",
      "/": "00100011",
      "%": "00100100",
    };
    return `${operators[op]} 00000000 ${toBin(x, 8)} ${toBin(y, 8)}`;
  },
  SYSTEM: (op, ...x) => {
    if (op === "PRINT") return `01100000 00000000 00000000 ${toBin(x[0], 8)}`;
  },
  BRANCH: (op, x, y, z) => {
    const operators = {
      "=": "00010000",
      "!": "00010001",
      "<": "00010010",
      ">": "00010011",
      "<=": "00010100",
      ">=": "00010101",
    };
    return `${operators[op]} ${toBin(x, 8)} ${toBin(y, 8)} ${toBin(z, 8)}`;
  },
  JUMP: (x) => `10010000 ${toBin(x, 24)}`,
  BITOP: (op, x, y) => {
    const operators = {
      "&": "00110000",
      "|": "00110001",
      ">>": "00110010",
      "<<": "00110011",
    };
    return `${operators[op]} 00000000 ${toBin(x, 8)} ${toBin(y, 8)}`;
  },
  CLEAN: () => "10100000 00000000 00000000 00000000",
};

asm.addEventListener("keyup", (e) => {
  const lines = asm.value.split("\n");
  let res = "";
  for (const line of lines) {
    const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    res += `${instructions[args[0]](...args.slice(1))}\n`;
  }
  vmc.innerText = res;
});

// const main = (() => {
//   code = `PUSH 0x48
// PUSH 0x65
// PUSH 0x6c
// PUSH 0x6c
// PUSH 0x6f
// PUSH 0x2c
// PUSH 0x20
// PUSH 0x57
// PUSH 0x6f
// PUSH 0x72
// PUSH 0x6c
// PUSH 0x64
// PUSH 0x21
// PUSH 0x00
// SYSTEM PRINT 0x01`;

//   code2 = `PUSH "Hello, World!"
// SYSTEM PRINT 0x01`;

//   const lines = code2.split("\n");
//   let res = "";
//   for (const line of lines) {
//     const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
//     res += `${instructions[args[0]](...args.slice(1))}\n`;
//   }

//   console.log(res);
// })();
