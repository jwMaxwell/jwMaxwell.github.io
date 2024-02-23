import { compress, decompress } from "./url-crunch.js";
import { checkParens } from "./validator.js"
import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { execute } from "./evaluator.js"

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs",
  },
});

const urlOptions = decompress(atob(location.hash.slice(1)));
let editor;
require(["vs/editor/editor.main"], () => {
  editor = monaco.editor.create(document.getElementById("code"), {
    value: location.hash
	  ? urlOptions.slice(urlOptions + 1).replace(/lambda/g, 'λ')
      : `;; Your code here...`,
    language: "scheme",
    theme: "vs-dark",
    "bracketPairColorization.enabled": true,
  });
});

// get themes
fetch("src/themes.json")
  .then((res) => res.json())
  .then((res) => {
    themes.innerHTML = Object.keys(res)
      .map((n) => `<option value="${n}" />`)
      .join("");

    require(["vs/editor/editor.main"], () => {
      for (const n of Object.keys(res)) {
        monaco.editor.defineTheme(n, res[n]);
      }
    });
  });

// code execution
run.addEventListener("click", () => {
    location.hash = btoa(compress(`${editor.getValue().replace(/λ/g, "lambda")}`));
    bufferState(true);

    editor.setValue(editor.getValue().replace(/lambda/g, "λ"));
    try {
	console.log(tokenize(editor.getValue()));
	console.log(parse(tokenize(editor.getValue())));
	output.innerText = execute(parse(checkParens(tokenize(editor.getValue()))));
    } catch (e) {
	output.innerText = e;
    }

    bufferState(false);
});
    
const bufferState = (bool) => {
  run.disabled = bool ? true : false;
  document.querySelector(".buffer-wheel").style.visibility = bool
    ? "visible"
    : "hidden";
};

// set themes
theme.addEventListener("change", () => {
  monaco.editor.setTheme(theme.value);
});

// dropdown toggle
document.querySelector(".dropbtn").addEventListener("click", () => {
  document.querySelector(".dropdown-content").classList.toggle("show-content");
});
