import { runASM } from "./asm.js";
import { runVMC } from "./vmc.js";

asm.addEventListener("keyup", (e) => {
  vmc.innerText = runASM(asm.value);
  output.innerText = runVMC(runASM(asm.value));
});
