// Get languages and populate language list
fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    langlist.innerHTML = res
      .map((n) => `<option value="${n.language} ${n.version}" />`)
      .join("");
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
  const [language, version] = lang.value.split(" ");
  return {
    method: "POST",
    body: JSON.stringify({
      language: language,
      version: version,
      files: [
        {
          name: `code.${language}`,
          content: editor.getValue(),
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
  run.disabled = true;
  const bufferWheel = document.querySelector(".buffer-wheel");
  bufferWheel.style.visibility = "visible";
  fetch("https://emkc.org/api/v2/piston/execute", prepareData())
    .then((res) => res.json())
    .then((res) => {
      run.disabled = false;
      bufferWheel.style.visibility = "hidden";
      output.innerText = res.run.stdout || res.run.stderr;
    });
});
