export const runIntermediary = (str) => {
  let variables = { _i: 0 };
  const labels = { _s: 0 };
  let vStack = [];
  let vLine = 0;
  let nullVars = 0;

  const arith = (op, x, y, z) => {
    if (z in variables) {
      vLine += 3;
      return `MATH ${op} ${variables[y]} ${variables[z]}\nMOVE ${
        variables._i + 1
      } ${variables[x]}\nPOP`;
    }
    vLine += 5;
    return `PUSH ${z}\nMATH ${op} ${variables[y]} ${variables._i + 1}\nMOVE ${
      variables._i + 2
    } ${variables[x]}\nPOP 2`;
  };

  const cond = (op, x, y, z) => {
    vLine++;
    return `BRANCH ${op} ${variables[x]} ${variables[y]} ${labels[z] - vLine}`;
  };

  const instructions = {
    DELINT: (x) => {
      nullVars++;
      const temp = `_null_${nullVars}`;
      variables[temp] = variables[x];
      delete variables[x];
      vLine += 3;
      return `PUSH 0\nMOVE ${variables._i + 1} ${variables[temp]}\nPOP`;
    },
    DELSTR: (x) => {
      delete variables[x];

      let res = "PUSH 0\n";
      for (let i = 0; i < vStack.length; ++i) {
        if (vStack[i] !== x) continue;
        nullVars++;
        variables[`_null_${nullVars}`] = i;

        vLine += 3;
        res += `MOVE ${variables._i + 1} ${variables[`_null_${nullVars}`]}\n`;
      }
      return `${res}POP`;
    },

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
      if (val && val.includes('"')) {
        variables[title] = vStack.length + 1;
        for (const _ of val.slice(1).split("")) {
          vStack.push(title);
          vLine++;
          variables._i++;
        }
        return `PUSH ${val}`;
      }

      if (nullVars) {
        const temp = Object.keys(variables).find((x) => x.includes("_null_"));
        variables[title] = variables[temp];
        delete variables[temp];

        vLine += 3;
        return `PUSH ${val}\nMOVE ${variables._i + 1} ${variables[title]}\nPOP`;
      }
      vStack.push(title);
      variables[title] = vStack.length;
      vLine++;
      variables._i++;
      return `PUSH ${val}`;
    },
    INC: (x) => {
      vLine += 5;
      return `PUSH 1\nMATH + ${variables[x]} ${variables._i + 1}\nMOVE ${
        variables._i + 2
      } ${variables[x]}\nPOP 2`;
    },
    DEC: (x) => {
      vLine += 5;
      return `PUSH 1\nMATH - ${variables[x]} ${variables._i + 1}\nMOVE ${
        variables._i + 2
      } ${variables[x]}\nPOP 2`;
    },
    "#": (title) => {
      labels[title] = vLine;
    },
    "//": () => {},
  };

  const lines = str.split("\n").filter((t) => t !== "");
  // get labels
  for (const line of lines) {
    if (line[0] === "#") {
      const args = line.split(" ");
      labels[args[1]] = 0;
    }
  }

  // get label values
  for (const line of lines) {
    console.log(`${line}\t\t${JSON.stringify(variables)}`);

    if (line === "") continue;
    const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    instructions[args[0]](...args.slice(1));
  }

  variables = { _i: 0 };
  vStack = [];
  vLine = 0;

  // generate code
  let res = "";
  for (const line of lines) {
    if (line === "" || line[0] === "#") continue;
    const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    res += `${instructions[args[0]](...args.slice(1))}\n`;
  }
  return res.split("undefined\n").join("");
};
