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

let editor;
require(["vs/editor/editor.main"], () => {
  editor = monaco.editor.create(document.getElementById("code"), {
    value: `// Your code here...`,
    language: "javascript",
    theme: "vs-dark",
  });
});

lang.addEventListener("change", () => {
  monaco.editor.setModelLanguage(editor.getModel(), lang.value.split(" ")[0]);
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
          content: code.innerText
            .replace(/[1-9]\n/g, "") // remove line numbers
            .split("") // the rest of this is to remove some unicode silliness
            .map((t) => (t.charCodeAt() === 160 ? String.fromCharCode(32) : t))
            .join(""),
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
    .then(
      (res) =>
        (output.innerHTML = res.run.stdout
          ? res.run.stdout.replace(/\\n/g, "<br>")
          : res.run.stderr.replace(/\\n/g, "<br>"))
    );
});
