let vmcMemory = [0];
let vmcOutput = "";

const binop = (a, op, b) => {
  const opRgx = new RegExp(
    /^(\+|-|\*|\*\*|\/|==|===|!=|!==|>|>>|<<|<|>=|<=|&|\||%|!|\^)$/
  );

  if (opRgx.test(op))
    return new Function("a", "b", `return a ${op} b`)(
      Number(`${a}`),
      Number(`${b}`)
    );
};

const btoi = (t) => {
  console.log(`btoi: ${t}`);
  if (t === undefined) return;
  return t[0] === "0" ? parseInt(t, 2) : parseInt(t.slice(1), 2) * -1;
};

const $toBin = (x) => {
  const res = parseInt(Math.abs(x)).toString(2).padStart(8, "0");
  return x < 0 || (x === 0 && !Object.is(0, x))
    ? [1, ...res.slice(1)].join("")
    : res;
};

const bind = (...x) => btoi(x.map($toBin).join(""));

const branch = (op, x, y, z) => {
  console.log("BRANCH args: ", op, x, y, z);

  if (binop(vmcMemory[x], op, vmcMemory[y])) vmcMemory[0] += z;
  if (binop(vmcMemory[x], op, vmcMemory[y])) {
    //DEBUG
    console.log(
      `BRANCHING : ${vmcMemory[x]} ${op} ${vmcMemory[y]} : ${binop(
        vmcMemory[x],
        op,
        vmcMemory[y]
      )} : vmcMemory[0] = ${vmcMemory[0]}`
    );
  }
};

const binInstructions = {
  "00010000": (x, y, z) => branch("===", x, y, z),
  "00010001": (x, y, z) => {
    console.log("BRANCH pre-args:", x, y, z);
    branch("!==", x, y, z);
  },
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
};

const decode = (dat) =>
  dat
    .split("")
    .map((t) => $toBin(t.charCodeAt(0)))
    .join("");

const encode = (dat) =>
  dat
    .replace(/\s+/g, "")
    .match(/.{1,8}/g)
    .map((t) => String.fromCharCode(parseInt(t, 2)))
    .join("");

export const runVMC = (str) => {
  const code = decode(encode(str)).match(/.{1,32}/g);
  vmcMemory = [0];
  vmcOutput = "";
  // console.debug(`code ->\n${decode(encode(str))}\n<-`);

  for (vmcMemory[0]; vmcMemory[0] < code.length; ++vmcMemory[0]) {
    console.debug(`stack: ${vmcMemory}`);
    const line = code[vmcMemory[0]];
    console.debug(`DEBUG: ${line}`);
    const bytes = line.match(/.{1,8}/g);
    console.debug(`bytes: ${bytes}`);
    binInstructions[bytes[0]](...bytes.slice(1).map(btoi));
  }

  return vmcOutput;
};
