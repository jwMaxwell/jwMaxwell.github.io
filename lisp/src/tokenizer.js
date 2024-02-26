import { addMessage } from "./system.js";

// Need to capture comments for proper token locations
const tokenRegex = /;(.*?)\n|\(|\)|"[^"]*"|'|[^\s()]+/g;

export const tokenize = (str) => {
  const tokens = [];

  `${str}\n`.replace(tokenRegex, (value, offset1, offset2) => {
    console.log(value, offset1, offset2);
    const offset = offset1 ?? offset2;
    const prev = str.slice(0, offset);
    let type = "identifier";

    if (value[0] === ";") return; // ignore comments
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
