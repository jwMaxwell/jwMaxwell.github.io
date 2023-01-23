import { runASM } from "./asm.js";
import { runVMC } from "./vmc.js";

window.onload = () => {
  vmc.innerText = runASM(asm.value);
  output.innerText = runVMC(runASM(asm.value));
};

asm.addEventListener("keyup", (e) => {
  vmc.innerText = runASM(asm.value);
  output.innerText = runVMC(runASM(asm.value));
});
