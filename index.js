fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    for (const n of res)
      document.getElementById(
        "lst"
      ).innerHTML += `<option value="${n.language} ${n.version}"/>`;
  });

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
  const elem = document.getElementById("lang");
  setLang(elem.value.split(" ")[0], elem.value.split(" ")[1]);

  code.files[0].content = document.getElementById("code").value;
  options.body = JSON.stringify(code);
  fetch("https://emkc.org/api/v2/piston/execute", options)
    .then((res) => res.json())
    .then(
      (res) =>
        (document.getElementById("output").innerHTML = JSON.stringify(
          res.run.stdout
        ).replace(/\\n/g, "<br>"))
    );
};

const setLang = (lang, version) => {
  [code.language, code.version] = [lang, version];
  code.files[0].name = code.files[0].name.replace(/[^.]+$/g, lang);
  options.body = JSON.stringify(code);
};

// Tab makes tabs
document.getElementById("code").addEventListener(
  "keydown",
  function (e) {
    const cursor = document.getElementById("code").selectionStart;
    if (e.keyCode === 9) {
      this.value += "    ";
      e.preventDefault();
    }
    document.getElementById("code").selectionStart = cursor;
  },
  false
);

// function getCursorPos(input) {
//   if ("selectionStart" in input && document.activeElement == input) {
//     return {
//       start: input.selectionStart,
//       end: input.selectionEnd,
//     };
//   } else if (input.createTextRange) {
//     var sel = document.selection.createRange();
//     if (sel.parentElement() === input) {
//       var rng = input.createTextRange();
//       rng.moveToBookmark(sel.getBookmark());
//       for (
//         var len = 0;
//         rng.compareEndPoints("EndToStart", rng) > 0;
//         rng.moveEnd("character", -1)
//       ) {
//         len++;
//       }
//       rng.setEndPoint("StartToStart", input.createTextRange());
//       for (
//         var pos = { start: 0, end: len };
//         rng.compareEndPoints("EndToStart", rng) > 0;
//         rng.moveEnd("character", -1)
//       ) {
//         pos.start++;
//         pos.end++;
//       }
//       return pos;
//     }
//   }
//   return -1;
// }
