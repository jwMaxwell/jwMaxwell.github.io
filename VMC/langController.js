import { runASM } from "./asm";
import { runVMC } from "./vmc";

asm.addEventListener("keyup", (e) => {
  vmc.innerText = runASM(asm.value);
  output.innerText = runVMC(vmc.innerText);
});
