export const binop = (a, op, b) => {
  const opRgx = new RegExp(
    /^(\+|-|\*|\*\*|\/|==|===|!=|!==|>|>>|<<|<|>=|<=|&|\||%|!|\^)$/
  );

  if (opRgx.test(op))
    return new Function("a", "b", `return a ${op} b`)(
      Number(`${a}`),
      Number(`${b}`)
    );
};

export const toBin = (x, padding) => {
  const res = parseInt(Math.abs(x)).toString(2).padStart(padding, "0");
  return x < 0 || (x === 0 && !Object.is(0, x))
    ? [1, ...res.slice(1)].join("")
    : res;
};
