const { core } = require('./coreFunctions');
const { parse, evaluate } = require("./evaluate.js");
const { exit } = require("process");
console.error = (x) => {
  console.log('\x1b[1m\x1b[31m' + x + '\x1b[0m'); 
  exit();
};

const execute = (input, env=core) =>
  parse(input).reduce(
    (ctx, line) => evaluate(line, ctx), env);

const main = (input) => {
  try {
    execute(input);
  } catch (error) {
    error.name === 'RangeError'
      ? console.error('Stack Overflow')
      : console.log(error);
  }
};

window.onkeyup = (e) => {
  main(document.getElementById('inpt').innerText);
};