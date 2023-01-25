const tokenize = (str) => {
  const target = `${str}\n`.replace(/(\/\/.*?\n)/g, "");
  const tokens = [];
  const rgx = /(\".*?\")|[A-Za-z]+|[0-9]+|[^a-zA-Z0-9\s]/g;
  while ((match = rgx.exec(target)) !== null) {
    if (!isNaN(Number(match[0])))
      tokens.push({
        type: "number",
        value: Number(match[0]),
        position: match.index,
      });
    else if (match[0][0] === '"' && match[0][match[0].length - 1] === '"')
      tokens.push({
        type: "string",
        value: match[0].slice(1, -1),
        position: match.index,
      });
    else if (match[0].match(/[A-Za-z]/g))
      tokens.push({ type: "id", value: match[0], position: match.index });
    else if (match[0].match(/[^a-zA-Z0-9\s]/g)) {
      tokens.push({ type: "operator", value: match[0], position: match.index });
    }
  }
  return tokens;
};

const code = `int main() {
  var string = "bar";
  array numbers = 1, 2, 3, 4;
  return 0;
}
`;
console.log(tokenize(code));
