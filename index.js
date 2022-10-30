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
    bracketPairColorization: true,
  });
});

lang.addEventListener("change", () => {
  monaco.editor.setModelLanguage(editor.getModel(), lang.value.split(/\s+/)[0]);
});

// prepare data for POST request
const prepareData = () => {
  const [language, version] = lang.value.split(/\s+/);
  return {
    method: "POST",
    body: JSON.stringify({
      language: language,
      version: version,
      files: [
        {
          name: `code`,
          content: editor.getValue(),
        },
      ],
      stdin: stdinput.value ?? "",
      args: args.value.split(/\s+/) ?? "",
      compile_timeout: parseInt(timeout.value) ?? "",
      run_timeout: parseInt(timeout.value) ?? "",
      compile_memory_limit: parseInt(memLimit.value) ?? -1,
      run_memory_limit: parseInt(memLimit.value) ?? -1,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  };
};

// Get languages and populate language list
fetch("https://emkc.org/api/v2/piston/runtimes")
  .then((res) => res.json())
  .then((res) => {
    langlist.innerHTML = res
      .map((n) => `<option value="${n.language} ${n.version}" />`)
      .join("");
  });

// get themes
fetch("themes.json")
  .then((res) => res.json())
  .then((res) => {
    themes.innerHTML = Object.keys(res)
      .map((n) => `<option value="${n}" />`)
      .join("");

    require(["vs/editor/editor.main"], () => {
      for (n of Object.keys(res)) {
        monaco.editor.defineTheme(n, res[n]);
      }
    });
  });

const bufferState = (bool) => {
  run.disabled = bool ? true : false;
  document.querySelector(".buffer-wheel").style.visibility = bool
    ? "visible"
    : "hidden";
};

// send POST request
run.addEventListener("click", () => {
  bufferState(true);
  fetch("https://emkc.org/api/v2/piston/execute", prepareData())
    .then((res) => res.json())
    .then((res) => {
      bufferState(false);
      output.innerText = res.run.stdout || res.run.stderr;
    });
});

// set themes
theme.addEventListener("change", () => {
  monaco.editor.setTheme(theme.value);
});

// dropdown toggle
document.querySelector(".dropbtn").addEventListener("click", () => {
  document.querySelector(".dropdown-content").classList.toggle("show-content");
});
