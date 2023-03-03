const { parse } = require("./parse.js");
const { execute } = require("./eval");
const fs = require("fs");

// execute(parse(fs.readFileSync(process.argv[2], "utf-8")));

const file = fs.readFileSync(process.argv[2], "utf-8");

if (process.argv[3] === "+o")
  process.argv[4]
    ? fs.writeFileSync(process.argv[4], JSON.stringify(parse(file)))
    : fs.writeFileSync("./src/release/ast.json", JSON.stringify(parse(file)));
else if (process.argv[3] === "+i") execute(JSON.parse(file));
else execute(parse(file));
