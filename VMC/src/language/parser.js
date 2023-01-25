const getAllMatches = (regex, str) => {
  const result = [];
  let match;
  while ((match = regex.exec(str))) result.push(match);
  return result;
};

const tokenize = (str) =>
  `${str}\n`
    .replace(/;(.*?)\n/g, "")
    .split("\n")
    .flatMap((line, lineNum) =>
      getAllMatches(/\(|\)|"[^"]*"|'|[^\s()]+/g, line).map((m) => ({
        val: m[0],
        loc: lineNum + ":" + m.index,
      }))
    );

const preparse = (tokens) => {
  const [indecies, res] = [[], []];
  tokens.map(({ val, loc }) => {
    if (val === "(") indecies.push(res.length);
    else if (val === ")") {
      if (!indecies.length) throw new Error(`Unexpected ) at ${loc}`);
      res.push(res.splice(indecies.pop()));
    } else res.push({ val: isNaN(val) ? val : Number(val), loc });
  });
  if (indecies.length) throw new Error(`Missing ${indecies.length} )`);
  return res;
};

const last = (arr) => arr[arr.length - 1];

const postparse = (node) => {
  if (!Array.isArray(node)) return node;
  const res = [];
  for (const n of node) {
    if (last(res)?.val === "'")
      res.splice(res.length - 1, 1, [
        { val: "quote", loc: n.loc },
        postparse(n),
      ]);
    else if (n.val?.[0] === '"' && last(n.val) === '"')
      res.push([
        { val: "quote", loc: n.loc },
        { val: n.val.slice(1, -1).replace(/\\n/g, "\n"), loc: n.loc },
      ]);
    else res.push(postparse(n));
  }
  return res;
};

export const parse = (str) => postparse(preparse(tokenize(str)));
