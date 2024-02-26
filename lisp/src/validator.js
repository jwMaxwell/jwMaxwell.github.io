import { addMessage } from "./evaluator.js";

const makeError = (token, message) => {
  const err =
    message +
    "\t" +
    `at: ${token.line}:${token.col}\n` +
    token.value +
    "\n" +
    "^" +
    "~".repeat(token.value.length - 1);

  addMessage("error", err);
  throw new Error(err + "\n\n");
};

export const evalError = (stack, message) => {
  const result = `${message}\n\t*> ${stack.join(
    "\n\tat "
  )}\n~~~ End of stack trace ~~~\n`;

  addMessage("error", result);
  return new Error(result);
};

const findDistance = (s1, s2) => {
  const costs = Array.from({ length: s1.length + 1 }, () =>
    Array(s2.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) {
    for (let j = 0; j <= s2.length; j++) {
      costs[i][j] =
        i === 0
          ? j
          : j === 0
          ? i
          : s1[i - 1] === s2[j - 1]
          ? costs[i - 1][j - 1]
          : Math.min(costs[i - 1][j], costs[i][j - 1], costs[i - 1][j - 1]) + 1;
    }
  }

  return costs[s1.length][s2.length];
};

const similarity = (s1, s2) => {
  const longer = s1.length < s2.length ? s2 : s1;
  const shorter = s1.length < s2.length ? s1 : s2;

  return longer.length === 0
    ? 1.0
    : (longer.length - findDistance(longer, shorter)) /
        parseFloat(longer.length);
};

export const bestMatch = (str, env) => {
  const likelihoods = [];
  for (const [key, value] of env) {
    likelihoods.push([key, similarity(str, key)]);
  }
  console.log(likelihoods);
  return likelihoods.sort((a, b) => a[1] - b[1]).pop()[0];
};

export const checkParens = (tokens) => {
  const stack = [];
  for (const token of tokens) {
    if (token.value === "(" && token.type === "symbol") {
      stack.push(token);
    } else if (token.value === ")" && token.type === "symbol" && stack.length) {
      stack.pop();
    } else if (token.value === ")" && token.type === "symbol") {
      makeError(token, `Unbalanced parens`);
    }
  }
  if (stack.length) {
    makeError(stack[0], `Unbalanced parens`);
  }

  return tokens;
};
