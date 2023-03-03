import { parse } from "./src/parse.js";
import { execute } from "./src/eval.js";

input.value = "";

input.addEventListener("keydown", () => {
  output.innerText = execute(parse(input.value));
  console.log(execute(parse(input.value)));
});
// execute(parse());
