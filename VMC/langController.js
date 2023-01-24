import { runASM } from "./src/asm.js";
import { runIntermediary } from "./src/intermediary.js";
import { runVMC } from "./src/vmc.js";

const defaultCode = `LET index 1
LET result 0
LET zero 0
LET max 100
LET fizz "Fizz"
LET buzz "Buzz"
LET fizzbuzz "FizzBuzz"

# Start
MOD result index 15
BEQ result zero FizzBuzz

MOD result index 5
BEQ result zero Buzz

MOD result index 3
BEQ result zero Fizz

PRINTI index
JUMP ReLoop

# FizzBuzz
PRINTS fizzbuzz
JUMP ReLoop

# Fizz
PRINTS fizz
JUMP ReLoop

# Buzz
PRINTS buzz

# ReLoop
INC index
BLTE index max Start

`;

intermediary.value = defaultCode;
// asm.value = defaultCode;
// vmc.innerText = runASM(defaultCode);
// output.innerText = runVMC(runASM(defaultCode));
const pipe =
  (...fns) =>
  (x) =>
    fns.reduce((v, f) => f(v), x);

intermediary.addEventListener("keyup", (e) => {
  asm.innerText = runIntermediary(intermediary.value);
  vmc.innerText = pipe(runIntermediary, runASM)(intermediary.value);
  output.innerText = pipe(runIntermediary, runASM, runVMC)(intermediary.value);
});
