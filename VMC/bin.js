const mem = [0];

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

const branch = (op, x, y, z) => {
  x = parseInt(x, 2);
  y = parseInt(y, 2);
  z = parseInt(z, 2);

  if (binop(mem[x], op, mem[y])) mem[0] += z;
};

const toBin = (x) => x.toString(2).padStart(8, "0");
const bind = (...x) => parseInt(x.map(toBin).join(""), 2);

const instructions = {
  "00010000": (x, y, z) => branch("===", x, y, z),
  "00010001": (x, y, z) => branch("!==", x, y, z),
  "00010010": (x, y, z) => branch("<", x, y, z),
  "00010011": (x, y, z) => branch(">", x, y, z),
  "00010100": (x, y, z) => branch("<=", x, y, z),
  "00010101": (x, y, z) => branch(">=", x, y, z),

  "00100000": (_, x, y) => mem.push(binop(parseInt(x, 2), "+", parseInt(y, 2))),
  "00100001": (_, x, y) => mem.push(binop(parseInt(x, 2), "-", parseInt(y, 2))),
  "00100010": (_, x, y) => mem.push(binop(parseInt(x, 2), "*", parseInt(y, 2))),
  "00100011": (_, x, y) => mem.push(binop(parseInt(x, 2), "/", parseInt(y, 2))),
  "00100100": (_, x, y) => mem.push(binop(parseInt(x, 2), "%", parseInt(y, 2))),

  "00110000": (_, x, y) => mem.push(binop(parseInt(x, 2), "&", parseInt(y, 2))),
  "00110001": (_, x, y) => mem.push(binop(parseInt(x, 2), "|", parseInt(y, 2))),
  "00110010": (_, x, y) =>
    mem.push(binop(parseInt(x, 2), ">>", parseInt(y, 2))),
  "00110011": (_, x, y) =>
    mem.push(binop(parseInt(x, 2), "<<", parseInt(y, 2))),

  "01000000": (addr, x1, x2) => (mem[addr] = bind(x1, x2)), //store
  "01010000": (_, loc, dest) => (mem[dest] = mem[loc]), //move

  "01100000": (op, x, y) => {
    if (op === 0) {
      let i = y;
      let res = "";
      while (mem[i] !== 0) {
        res += String.fromCharCode(mem[i]);
        ++i;
      }
      console.log(res);
    }
  }, //system

  "01110000": (x1, x2, x3) => mem.push(bind(x1, x2, x3)), //push
  10000000: (_1, _2, _3) => mem.pop(), //pop
  10010000: (x1, x2, x3) => (mem[0] += bind(x1, x2, x3)), //jump
  10100000: (_1, _2, _3) => (mem = [0]), //clean
};

const data =
  "011100000000000000000000010010000111000000000000000000000110010101110000000000000000000001101100011100000000000000000000011011000111000000000000000000000110111101110000000000000000000000101100011100000000000000000000001000000111000000000000000000000101011101110000000000000000000001101111011100000000000000000000011100100111000000000000000000000110110001110000000000000000000001100100011100000000000000000000001000010111000000000000000000000000000001100000000000000000000000000001";

const decode = (dat) =>
  dat
    .split("")
    .map((t) => toBin(t.charCodeAt(0)))
    .join("");

const encode = (dat) =>
  dat
    .replace(/\s+/g, "")
    .match(/.{1,8}/g)
    .map((t) => String.fromCharCode(parseInt(t, 2)))
    .join("");

const main = (() => {
  const code = decode(encode(data)).match(/.{1,32}/g);

  for (mem[0]; mem[0] < code.length; ++mem[0]) {
    const line = code[mem[0]];
    console.debug(`DEBUG: ${line}`);
    const bytes = line.match(/.{1,8}/g);
    instructions[bytes[0]](...bytes.slice(1).map((t) => parseInt(t, 2)));
  }
})();
