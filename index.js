const query = (e) => document.querySelector(e);

// Get languages and populate language list
fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    for (const n of res)
      query(
        "#langlist"
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

const prepareData = () => {};

// send POST request
const run = () => {
  const elem = query("#lang");
  setLang(elem.value.split(" ")[0], elem.value.split(" ")[1]);

  code.files[0].content = query("#code").value;
  options.body = JSON.stringify(code);
  fetch("https://emkc.org/api/v2/piston/execute", options)
    .then((res) => res.json())
    .then(
      (res) =>
        (query("#output").innerHTML = JSON.stringify(res.run.stdout).replace(
          /\\n/g,
          "<br>"
        ))
    );
};

const setLang = (lang, version) => {
  [code.language, code.version] = [lang, version];
  code.files[0].name = code.files[0].name.replace(/[^.]+$/g, lang);
  options.body = JSON.stringify(code);
};

// Tab makes tabs
query("#code").addEventListener(
  "keydown",
  function (e) {
    const cursor = query("#code").selectionStart;
    if (e.keyCode === 9) {
      this.value = inject(this.value, cursor, "    ");
      e.preventDefault();
      query("#code").selectionEnd = cursor + 4;
    }
  },
  false
);

const inject = (str, pos, val) =>
  [str.slice(0, pos), val, str.slice(pos, str.length)].join("");
