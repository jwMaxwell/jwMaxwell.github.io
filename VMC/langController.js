import { runASM } from "./src/asm.js";
import { runIntermediary } from "./src/intermediary.js";
// import { runIntermediary } from "./src/compiler.js";
import { runVMC } from "./src/vmc.js";

const intermediary = document.querySelector('#intermediary');

const onChange = () => {
  const asm = (document.querySelector('#asm').innerText = runIntermediary(
    intermediary.value
  ));
  const vmc = (document.querySelector('#vmc').innerText = runASM(asm));
  document.querySelector('#output').innerText = runVMC(vmc);
};

intermediary.addEventListener('keyup', onChange);
onChange();