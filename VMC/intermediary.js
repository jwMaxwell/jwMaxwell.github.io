/*export*/ const runIntermediary = (str) => {
  const variables = { _i: 0, zero: 0 };
  const labels = { _s: 0 };
  const vStack = [];
  let vLine = 0;

  const arith = (op, x, y, z) => {
    if (z in variables) {
      vLine += 3;
      return `MATH ${op} ${variables[y]} ${variables[z]}\nMOVE ${
        variables._i + 1
      } ${variables[x]}\nPOP`;
    }
    vLine += 5;
    return `PUSH ${z}\nMATH ${op} ${variables[y]} ${variables._i + 1}\nMOVE ${
      variables._i + 1
    } ${variables[x]}\nPOP 2`;
  };

  const cond = (op, x, y, z) => {
    vLine += 1;
    return `BRANCH ${op} ${variables[x]} ${variables[y]} ${labels[z] - vLine}`;
  };

  const intermediateInstructions = {
    BEQ: (x, y, z) => cond("=", x, y, z),
    BNEQ: (x, y, z) => cond("!", x, y, z),
    BGT: (x, y, z) => cond(">", x, y, z),
    BGTE: (x, y, z) => cond(">=", x, y, z),
    BLT: (x, y, z) => cond("<", x, y, z),
    BLTE: (x, y, z) => cond("<=", x, y, z),

    ADD: (x, y, z) => arith("+", x, y, z),
    SUB: (x, y, z) => arith("-", x, y, z),
    MULT: (x, y, z) => arith("*", x, y, z),
    DIV: (x, y, z) => arith("/", x, y, z),
    MOD: (x, y, z) => arith("%", x, y, z),

    AND: (x, y, z) => arith("&", x, y, z),
    OR: (x, y, z) => arith("|", x, y, z),
    RSHIFT: (x, y, z) => arith(">>", x, y, z),
    LSHIFT: (x, y, z) => arith("<<", x, y, z),

    PRINTS: (x) => {
      vLine++;
      return `SYSTEM PRINT STRING ${variables[x]}`;
    },
    PRINTC: (x) => {
      vLine++;
      return `SYSTEM PRINT CHAR ${variables[x]}`;
    },
    PRINTI: (x) => {
      vLine++;
      return `SYSTEM PRINT INT ${variables[x]}`;
    },

    JUMP: (title) => {
      vLine++;
      return `JUMP ${labels[title] - vLine}`;
    },
    LET: (title, val) => {
      vStack.push(title);
      variables[title] = vStack.length;
      vLine++;
      variables._i++;
      return `PUSH ${val}`;
    },
    INC: (x) => {
      vLine += 4;
      return `PUSH 1\nMATH + ${variables[x]} ${variables._i + 1}\nMOVE ${
        variables._i + 1
      } ${variables[x]}\nPOP`;
    },
    DEC: (x) => {
      vLine += 4;
      return `PUSH 1\nMATH - ${variables[x]} ${variables._i + 1}\nMOVE ${
        variables._i + 1
      } ${variables[x]}\nPOP`;
    },
    "#": (title) => {
      labels[title] = vLine + 1;
    },
    "//": () => {},
  };

  const lines = str.split("\n");
  let res = "";
  for (const line of lines) {
    if (line === "") continue;
    const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    res += `${intermediateInstructions[args[0]](...args.slice(1))}\n`;
  }
  return res.split("undefined\n").join("");
};

const txt = `LET i 0
LET max 100
# start
PRINTI i
ADD i i 1
BLT i max start`;
console.log(runIntermediary(txt));
