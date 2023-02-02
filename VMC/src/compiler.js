import { binop } from "./util.js";

export const runIntermediary = (str) => {
  let variables = { _i: { addr: NaN, val: 0 } };
  const labels = { _s: 0 };
  let vStack = [];
  let vLine = 0;
  let nullVars = 0;

  const isPtr = (x) => x.slice(1) in variables && x[0] === "*";

  const arith = (op, x, y, z) => {
    if (isPtr(x)) {
      const num1 = isPtr(y) ? variables[y.slice(1)] : y;
      const num2 = isPtr(z) ? variables[z.slice(1)] : z;

      variables[x.slice(1)] = binop(num1, op, num2);
      return;
    }

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
    },
    DELSTR: (x) => {
      delete variables[x];

      for (let i = 0; i < vStack.length; ++i) {
        if (vStack[i] !== x) continue;
        nullVars++;
        variables[`_null_${nullVars}`] = i + 1;
      }
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

    // JUMP: (title) => {
    //   vLine++;
    //   return `JUMP ${labels[title] - vLine}`;
    // },
    ARRAY: (title, ...vals) => {
      let res = "";
      for (let i = 0; i < vals.length; ++i) {
        variables[`${title}.${i}`] = vStack.length + 1;
        vStack.push(`${title}.${i}`);
        vLine++;
        variables._i++;
        res += `PUSH ${vals[i]}\n`;
      }
      return res.slice(0, -1);
    },
    PTR: (title, val) => {
      variables[title] = isNaN(Number(val)) ? variables[val] : val;
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
        console.log(`\nnull: ${temp}\nnull var: ${variables[temp]}`);
        variables[title] = variables[temp];
        console.log(`new var: ${variables[title]}\n`);
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
      if (isPtr(x)) {
        variables[x.slice(1)]++;
        return;
      }

      vLine += 5;
      return `PUSH 1\nMATH + ${variables[x]} ${variables._i + 1}\nMOVE ${
        variables._i + 2
      } ${variables[x]}\nPOP 2`;
    },
    DEC: (x) => {
      if (isPtr(x)) {
        variables[x.slice(1)]--;
        return;
      }

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

  // get labels
  let lines = str.split("\n").filter((t) => t !== "");
  for (let i = 0; i < lines.length; ++i)
    if (lines[i].trim()[0] === "#") labels[lines[i].split(" ")[1]] = i;

  lines = lines.filter((t) => !t.includes("#"));

  // reset vars
  [variables, vStack, vLine, nullVars] = [{ _i: 0 }, [], 0, 0];

  // generate code
  let res = "";
  for (let i = 0; i < lines.length; ++i) {
    const args = lines[i].split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
    if (args[0] === "JUMP") {
      i = labels[args[1]];
      continue;
    }

    res += `${instructions[args[0]](...args.slice(1))}\n`;
  }

  return res;
  // optimize

  // // generate code
  // let res = "";
  // for (const line of lines) {
  //   console.log(`${line}\t\t\t\t\t${JSON.stringify(variables)}`);

  //   if (line === "" || line[0] === "#") continue;
  //   const args = line.split(/ +(?=(?:(?:[^"]*"){2})*[^"]*$)/g);
  //   res += `${instructions[args[0]](...args.slice(1))}\n`;
  // }
  // return res.split("undefined\n").join("");
};
