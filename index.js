fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    for (const n of res)
      document.getElementById(
        "dropdown"
      ).innerHTML += `<button class="option" onclick="setLang('${n.language}', '${n.version}')">${n.language}</button>`;
  });

const url = "https://emkc.org/api/v2/piston/execute";

// post body data
let code = {
  language: "js",
  version: "1.16.2",
  files: [
    {
      name: "code.js",
      content: "console.log('hello world')",
    },
  ],
  stdin: "",
  args: [],
  compile_timeout: 10000,
  run_timeout: 3000,
  compile_memory_limit: -1,
  run_memory_limit: -1,
};

// request options
let options = {
  method: "POST",
  body: JSON.stringify(code),
  headers: {
    "Content-Type": "application/json",
  },
};

// send POST request
const run = () => {
  code.files[0].content = document.getElementById("code").innerText;
  options.body = JSON.stringify(code);
  fetch(url, options)
    .then((res) => res.json())
    .then(
      (res) =>
        (document.getElementById("output").innerHTML = JSON.stringify(
          res
        ).replace(/\\n/g, "<br>"))
    );
};

const setLang = (lang, version) => {
  [code.language, code.version] = [lang, version];
  code.files[0].name = code.files[0].name.replace(/[^.]+$/g, lang);
  options.body = JSON.stringify(code);
};

document.getElementById("code").addEventListener(
  "keyup",
  (_) => {
    const text = document.getElementById("code");
    hljs.highlightAll(text.innerText);

    caretToEnd(text);
    text.focus();
  },
  false
);

const caretToEnd = (element) => {
  let range, selection;
  if (document.createRange) {
    //Firefox, Chrome, Opera, Safari, IE 9+
    range = document.createRange(); //Create a range (a range is a like the selection but invisible)
    range.selectNodeContents(element); //Select the entire contents of the element with the range
    range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
    selection = window.getSelection(); //get the selection object (allows you to change selection)
    selection.removeAllRanges(); //remove any selections already made
    selection.addRange(range); //make the range you have just created the visible selection
  }
};
