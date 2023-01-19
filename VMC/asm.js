const escapeChars = (str) => {
  return str
    .replace(/\\s/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
};

const toBin = (x, padding) => {
  const res = parseInt(Math.abs(x)).toString(2).padStart(padding, "0");
  return x < 0 ? [1, ...res.slice(1)].join("") : res;
};

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
    const str = "10000000 00000000 00000000 00000000\n";
    return isNaN(parseInt(x)) ? str.slice(0, -1) : str.repeat(x).slice(0, -1);
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
    if (op === "PRINT" && x[0] === "STRING")
      return `01100000 00000000 00000000 ${toBin(x[1], 8)}`;
    if (op === "PRINT" && x[0] === "INT")
      return `01100000 00000001 00000000 ${toBin(x[1], 8)}`;
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

export const runASM = (str) => {
  const lines = escapeChars(str).split("\n");
  let res = "";
  for (const line of lines) {
    if (line === "") continue;
    const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    res += `${instructions[args[0]](...args.slice(1))}\n`;
  }
  return res
    .split("\n")
    .map((t) => t.replace(/\s+/g, ""))
    .join("\n");
};
