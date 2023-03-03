import { tokenize, parse } from "./src/parse";
import { execute } from "./src/eval";

input.value = "";

input.addEventListener("keydown", () => {
  output.innerText = execute(parse(input.value));
  console.log(execute(parse(input.value)));
});
// execute(parse());
