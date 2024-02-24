import { addMessage, getMessages } from "./evaluator.js";

const tokenRegex = /\(|\)|"[^"]*"|'|[^\s()]+/g;

export const tokenize = (str) => {
  const tokens = [];

  `${str}\n`
    .replace(/;(.*?)\n/g, "")
    .replace(tokenRegex, (value, offset, _) => {
      const prev = str.slice(0, offset);
      let type = "identifier";
      if (!isNaN(Number(value))) {
        type = "number";
        value = Number(value);
      } else if ("()[]{}.".includes(value)) {
        type = "symbol";
      } else if (value[0] === '"' && value.slice(-1) === '"') {
        type = "string";
        value = value.slice(1, -1);
      }

      tokens.push({
        value,
        type,
        line: prev.split("\n").length,
        col: prev.length - prev.lastIndexOf("\n"),
      });
    });

  tokens.map((t) => addMessage("token", t));
  return tokens;
};
