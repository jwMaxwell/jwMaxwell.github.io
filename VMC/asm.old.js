/* const fs = require('fs'); */

const memory = [0];

const instructions = {
  STORE: (val, loc) => (memory[loc] = val),
  PUSH: (val) => memory.push(val),
  MOVE: (loc, dest) => (memory[dest] = memory[loc]),
  POP: () => {
    memory.pop();
    return null;
  },
  MATH: (op, x, y) => {
    if (op === "+" && (isNaN(Number(memory[x])) || isNaN(Number(memory[y]))))
      memory.push(memory[x] + memory[y]);
    else if (op === "+") memory.push(memory[x] - -memory[y]);
    else if (op === "-") memory.push(memory[x] - memory[y]);
    else if (op === "*") memory.push(memory[x] * memory[y]);
    else if (op === "/") memory.push(memory[x] / memory[y]);
    else if (op === "%") memory.push(memory[x] % memory[y]);
  },
  SYSTEM: (op, val) => {
    if (op === "PRINT") console.log(memory[val]);
  },
  BRANCH: (op, x, y, z) => {
    if (op === "=")
      if (memory[x] == memory[y]) memory[0] = z - 2;
      else if (op === "!")
        if (memory[x] !== memory[y]) memory[0] = z - 2;
        else if (op === "<")
          if (memory[x] < memory[y]) memory[0] = z - 2;
          else if (op === ">")
            if (memory[x] > memory[y]) memory[0] = z - 2;
            else if (op === "<=")
              if (memory[x] <= memory[y]) memory[0] = z - 2;
              else if (op === ">=")
                if (memory[x] >= memory[y]) memory[0] = z - 2;
  },
  JUMP: (val) => (memory[0] = val - 2),
  BITOP: (op, x, y) => {
    if (op === "&") memory.push(memory[x] & memory[y]);
    else if (op === "|") memory.push(memory[x] | memory[y]);
    else if (op === ">") memory.push(memory[x] >> memory[y]);
    else if (op === "<") memory.push(memory[x] << memory[y]);
  },
  LIST: (loc, ...vals) => {
    memory[loc] = [...vals];
  },
  LGET: (loc, index) => memory[loc][index],
  CLEAN: () => (memory = [0]),
};

const escapeChars = (str) => {
  return str
    .replace(/\\s/g, " ")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r");
};

const print = (x) => {
  console.log(x);
  return x;
};

const code =
  "PUSH 0x01\nPUSH 0x01\nPUSH 0x00\nPUSH 0x65\nPUSH 0x03\nPUSH 0x05\nPUSH 0x0F\nPUSH FIZZ\nPUSH BUZZ\nPUSH FIZZBUZZ\nBRANCH = 0x01 0x04 0x2F\nMATH % 0x01 0x07\nBRANCH = 0x0B 0x03 0x1A\nMATH % 0x01 0x06\nBRANCH = 0x0C 0x03 0x20\nMATH % 0x01 0x05\nBRANCH = 0x0D 0x03 0x27\nSYSTEM PRINT 0x01\nPOP\nPOP\nPOP\nMATH + 0x01 0x02\nMOVE 0x0B 0x01\nPOP\nJUMP 0x0B\nPOP\nSYSTEM PRINT 0x0A\nMATH + 0x01 0x02\nMOVE 0x0B 0x01\nPOP\nJUMP 0x0B\nPOP\nPOP\nSYSTEM PRINT 0x09\nMATH + 0x01 0x02\nMOVE 0x0B 0x01\nPOP\nJUMP 0x0B\nPOP\nPOP\nPOP\nSYSTEM PRINT 0x08\nMATH + 0x01 0x02\nMOVE 0x0B 0x01\nPOP\nJUMP 0x0B";

const main = (() => {
  /* const lines = fs.readFileSync(process.argv[2], 'utf-8', flag='r')
    .split('\n'); */

  const lines = code.split("\n");

  for (memory[0]; memory[0] < lines.length; ++memory[0]) {
    const args = lines[memory[0]]
      .split(/\s+/g)
      .map(escapeChars)
      .map((t) => Number(t) || t);
    instructions[args[0]](...args.slice(1));
  }
})();

asm.innerText = code;
