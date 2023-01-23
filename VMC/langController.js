import { runASM } from "./asm.js";
import { runVMC } from "./vmc.js";

window.onload = () => {
  const defaultCode = `PUSH 1 //index
PUSH 1 //increment 
PUSH 0 //mod result 
PUSH 100 //max
PUSH 3 //fizz
PUSH 5 //buzz
PUSH 15 //fizz buzz
PUSH "Fizz"
PUSH "Buzz"
PUSH "FizzBuzz"
MATH % 0x01 0x07
MATH % 0x01 0x06
MATH % 0x01 0x05
BRANCH = 27 0x03 4
BRANCH = 28 0x03 5
BRANCH = 29 0x03 6
SYSTEM PRINT INT 0x01
JUMP 1
SYSTEM PRINT STRING 0x12
JUMP 1
SYSTEM PRINT STRING 0x0D
JUMP 1
SYSTEM PRINT STRING 0x08
POP 3
MATH + 0x01 0x02
MOVE 27 0x01
POP
BRANCH > 0x01 0x04 64
JUMP -21`;

  asm.value = defaultCode;
  vmc.innerText = runASM(defaultCode);
  output.innerText = runVMC(runASM(defaultCode));
};

asm.addEventListener("keyup", (e) => {
  vmc.innerText = runASM(asm.value);
  output.innerText = runVMC(runASM(asm.value));
});
