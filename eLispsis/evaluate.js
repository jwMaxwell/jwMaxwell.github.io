const { exit } = require("process");
console.error = (x) => {
  console.log('\x1b[1m\x1b[31m' + x + '\x1b[0m'); 
  exit();
};

const tokenize = (str) =>
  `( ${str}\n )`
    .replace(/;(.*?)\n/g, "")
    .match(/"(.*?)"|\(|\)|'|[^\s()]+/g)

const preparse = (tokens, ast=[]) => {
  const t = tokens.shift();
  return t === undefined
    ? ast.pop()
    : t === '('
    ? (ast.push(preparse(tokens, [])), preparse(tokens, ast))
    : t === ')'
    ? ast
    : !isNaN(parseFloat(t))
    ? preparse(tokens, [...ast, parseFloat(t)])
    : preparse(tokens, [...ast, t]);
}

const isAtom = (expr) => !Array.isArray(expr) || !expr.length;
const postparse = (ast) => {
  if (isAtom(ast)) return ast;
  const result = [];
  ast.map(n => 
    result[result.length - 1] === "'" 
      ? result.splice(result.length - 1, 1, ['quote', postparse(n)])
      : n[0] === '"' && n[n.length - 1] === '"'
      ? result.push(['quote', n.slice(1, -1)])
      : result.push(postparse(n))
  );
  return result;
}

const evaluate = (ast, ctx) => {
  if (ast === undefined)
    console.error('Invalid parameter list');
  if (ctx === undefined)
    console.error('Lost Context');
  else if (isAtom(ast) && !isNaN(parseFloat(ast)))
    return parseFloat(ast);
  else if (isAtom(ast)) {
    try {
      for (const [key, val] of ctx) {
        if (key === ast) return val;
      }
    } catch (error) {
      console.error('Unbalanced Parens');
    }
  
    console.error(`${ast} is not defined`);
  } else {
    const func = evaluate(ast[0], ctx);
    return func instanceof Function ? func(ast.slice(1), ctx) : func;
  }
};

const parse = (str) => postparse(preparse(tokenize(str)));

module.exports = { parse, evaluate, isAtom };