fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    for (const n of res)
      document.getElementById(
        "dropdown"
      ).innerHTML += `<button class="option" onclick="setLang('${n.language}', '${n.version}')">${n.language}</button>`;
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

document.getElementById("code").addEventListener("keydown", (e) => {
  if (e.keycode === 9) {
    this.value += "    ";
    if (e.preventDefault) e.preventDefault();
  }
});
