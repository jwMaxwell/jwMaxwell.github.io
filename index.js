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

const prepareData = () => {
  return {
    method: "POST",
    body: JSON.stringify({
      language: query("#lang").value.split(" ")[0],
      version: query("#lang").value.split(" ")[1],
      files: [
        {
          name: `code.${query("#lang").value.split(" ")[0]}`,
          content: query("#code").value,
        },
      ],
      stdin: "",
      args: [],
      compile_timeout: 10000,
      run_timeout: 30000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

// send POST request
const run = () => {
  fetch("https://emkc.org/api/v2/piston/execute", prepareData())
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
