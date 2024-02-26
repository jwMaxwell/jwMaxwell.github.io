import { addMessage } from "./system.js";

const buildAST = (tokens, ast = []) => {
  const token = tokens.shift();
  if (token === undefined) {
    return ast;
  } else if (token.value === "(" && token.type === "symbol") {
    ast.push(buildAST(tokens));
    return buildAST(tokens, ast);
  } else if (token.value === ")" && token.type === "symbol") {
    return ast;
  } else {
    return buildAST(tokens, [...ast, token]);
  }
};

const parseQuote = (ast) => {
  if (Array.isArray(ast)) {
    for (let i = 0; i < ast.length; ++i) {
      if (Array.isArray(ast[i])) {
        ast[i] = parseQuote(ast[i]);
      } else if (ast[i].value === "'" && ast[i].type === "identifier") {
        ast[i].value = "quote";
        ast[i] = [ast[i], ast[i + 1]];
        ast.splice(i + 1, 1);
      }
    }
  }
  return ast;
};

export const parse = (tokens) => {
  const res = parseQuote(buildAST(tokens));
  addMessage("ast", res);
  return res;
};
