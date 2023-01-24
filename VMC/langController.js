import { runASM } from "./asm.js";
import { runIntermediary } from "./intermediary.js";
import { runVMC } from "./vmc.js";

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
BLTE index max Start`;

intermediary.value = defaultCode;
// asm.value = defaultCode;
// vmc.innerText = runASM(defaultCode);
// output.innerText = runVMC(runASM(defaultCode));

intermediary.addEventListener("keyup", (e) => {
  asm.innerText = runIntermediary(intermediary.value);
  vmc.innerText = runASM(asm.value);
  output.innerText = runVMC(runASM(asm.value));
});
