let memory = [0];
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
  // x = parseInt(x, 2);
  // y = parseInt(y, 2);
  // z = btoi(z, 2);

  if (binop(memory[x], op, memory[y])) memory[0] += z;
  if (binop(memory[x], op, memory[y])) {
    //DEBUG
    console.log(
      `BRANCHING : ${memory[x]} ${op} ${memory[y]} : ${binop(
        memory[x],
        op,
        memory[y]
      )} : memory[0] = ${memory[0]}`
    );
  }
};

const cmds = {
  "00010000": (x, y, z) => branch("===", x, y, z),
  "00010001": (x, y, z) => {
    console.log("BRANCH pre-args:", x, y, z);
    branch("!==", x, y, z);
  },
  "00010010": (x, y, z) => branch("<", x, y, z),
  "00010011": (x, y, z) => branch(">", x, y, z),
  "00010100": (x, y, z) => branch("<=", x, y, z),
  "00010101": (x, y, z) => branch(">=", x, y, z),

  "00100000": (_, x, y) => memory.push(binop(x, "+", y)),
  "00100001": (_, x, y) => memory.push(binop(x, "-", y)),
  "00100010": (_, x, y) => memory.push(binop(x, "*", y)),
  "00100011": (_, x, y) => memory.push(binop(x, "/", y)),
  "00100100": (_, x, y) => memory.push(binop(x, "%", y)),

  "00110000": (_, x, y) => memory.push(binop(x, "&", y)),
  "00110001": (_, x, y) => memory.push(binop(x, "|", y)),
  "00110010": (_, x, y) => memory.push(binop(x, ">>", y)),
  "00110011": (_, x, y) => memory.push(binop(x, "<<", y)),

  "01000000": (addr, x1, x2) => (memory[addr] = bind(x1, x2)), //store
  "01010000": (_, loc, dest) => (memory[dest] = memory[loc]), //move

  "01100000": (op, x, y) => {
    if (op === 0) {
      //print string
      let i = y;
      let res = "";
      while (memory[i] !== 0) {
        res += String.fromCharCode(memory[i]);
        ++i;
      }
      vmcOutput += `${res}\n`;
      console.log(res);
    } else if (op === 1) {
      //print int
      vmcOutput += `${memory[y]}\n`;
      console.log(memory[y]);
    }
  }, //system

  "01110000": (x1, x2, x3) => memory.push(bind(x1, x2, x3)), //push
  10000000: (_1, _2, _3) => memory.pop(), //pop
  10010000: (x1, x2, x3) => (memory[0] += bind(x1, x2, x3)), //jump
  10100000: (_1, _2, _3) => (memory = [0]), //clean
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

  // console.debug(`code ->\n${decode(encode(str))}\n<-`);

  for (memory[0]; memory[0] < code.length; ++memory[0]) {
    const line = code[memory[0]];
    console.debug(`DEBUG: ${line}`);
    const bytes = line.match(/.{1,8}/g);
    console.debug(`bytes: ${bytes}`);
    cmds[bytes[0]](...bytes.slice(1).map(btoi));
  }

  return vmcOutput;
};
