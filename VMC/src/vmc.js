import { binop, toBin } from "./util.js";

export const runVMC = (str) => {
  let vmcMemory = [0];
  let vmcOutput = "";

  const btoi = (t) => {
    if (t === undefined) return;
    return t[0] === "0" ? parseInt(t, 2) : parseInt(t.slice(1), 2) * -1;
  };

  const bind = (...x) => btoi(x.map((t) => toBin(t, 8)).join(""));

  const branch = (op, x, y, z) => {
    if (binop(vmcMemory[x], op, vmcMemory[y])) vmcMemory[0] += z;
  };

  const instructions = {
    "00010000": (x, y, z) => branch("===", x, y, z),
    "00010001": (x, y, z) => branch("!==", x, y, z),
    "00010010": (x, y, z) => branch("<", x, y, z),
    "00010011": (x, y, z) => branch(">", x, y, z),
    "00010100": (x, y, z) => branch("<=", x, y, z),
    "00010101": (x, y, z) => branch(">=", x, y, z),

    "00100000": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "+", vmcMemory[y])),
    "00100001": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "-", vmcMemory[y])),
    "00100010": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "*", vmcMemory[y])),
    "00100011": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "/", vmcMemory[y])),
    "00100100": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "%", vmcMemory[y])),

    "00110000": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "&", vmcMemory[y])),
    "00110001": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "|", vmcMemory[y])),
    "00110010": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], ">>", vmcMemory[y])),
    "00110011": (_, x, y) =>
      vmcMemory.push(binop(vmcMemory[x], "<<", vmcMemory[y])),

    "01000000": (addr, x1, x2) => (vmcMemory[addr] = bind(x1, x2)), //store
    "01010000": (_, loc, dest) => (vmcMemory[dest] = vmcMemory[loc]), //move

    "01100000": (op, x, y) => {
      if (op === 0) {
        //print string
        let i = y;
        let res = "";
        while (vmcMemory[i] !== 0) {
          res += String.fromCharCode(vmcMemory[i]);
          ++i;
        }
        vmcOutput += `${res}\n`;
        console.log(res);
      } else if (op === 1) {
        //print int
        vmcOutput += `${vmcMemory[y]}\n`;
        console.log(vmcMemory[y]);
      } else if (op === 2) {
        //print char
        vmcOutput += `${String.fromCharCode(vmcMemory[y])}\n`;
        console.log(String.fromCharCode(vmcMemory[y]));
      }
    }, //system

    "01110000": (x1, x2, x3) => vmcMemory.push(bind(x1, x2, x3)), //push
    10000000: (_1, _2, _3) => vmcMemory.pop(), //pop
    10010000: (x1, x2, x3) => (vmcMemory[0] += bind(x1, x2, x3)), //jump
    10100000: (_1, _2, _3) => (vmcMemory = [0]), //clean
    10110000: (x1, x2, x3) =>
      vmcMemory.push(vmcMemory[vmcMemory[bind(x1, x2, x3)]]), //dereference
  };

  const code = str.replace(/\s+/g, "").match(/.{1,32}/g);
  vmcMemory = [0];
  vmcOutput = "";

  for (vmcMemory[0]; vmcMemory[0] < code.length; ++vmcMemory[0]) {
    const line = code[vmcMemory[0]];
    const bytes = line.match(/.{1,8}/g);
    instructions[bytes[0]](...bytes.slice(1).map(btoi));
  }

  return vmcOutput;
};
