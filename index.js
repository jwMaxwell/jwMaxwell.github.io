// Get languages and populate language list
fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    for (const n of res)
      langlist.innerHTML += `<option value="${n.language} ${n.version}"/>`;
  });

require.config({
  paths: {
    vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.1/min/vs",
  },
});

require(["vs/editor/editor.main"], () => {
  const editor = monaco.editor.create(document.getElementById("code"), {
    value: `// Your code here...`,
    language: "javascript",
    theme: "vs-dark",
  });
});

// prepare data for POST request
const prepareData = () => {
  const langData = lang.value.split(" ");
  return {
    method: "POST",
    body: JSON.stringify({
      language: langData[0],
      version: langData[1],
      files: [
        {
          name: `code.${langData[0]}`,
          content: code.innerText.replace(/[1-9]\n/g, ""),
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
run.addEventListener("click", () => {
  fetch("https://emkc.org/api/v2/piston/execute", prepareData())
    .then((res) => res.json())
    .then((res) => (output.innerHTML = res.run.stdout.replace(/\\n/g, "<br>")));
});

// inject data into string
const inject = (str, pos, val) =>
  [str.slice(0, pos), val, str.slice(pos)].join("");

// Tab makes tabs
code.addEventListener(
  "keydown",
  function (e) {
    const position = code.selectionStart;
    if (e.keyCode === 9) {
      this.value = inject(this.value, position, "    ");
      e.preventDefault();
      code.selectionEnd = position + 4;
    }
  },
  false
);
