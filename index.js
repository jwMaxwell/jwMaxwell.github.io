// <!DOCTYPE html>
// <html>
//   <head>
//     <title>Joshua Maxwell</title>
//     <link rel="stylesheet" href="./style.css" />
//   </head>
//   <body>
//     <h2>Code projects:</h2>
//     <div id="projects"></div>
//     <a href="./code/">Code editor and execution engine</a>
//     <br / >
//     <a href="./VMC/">Virtual machine code + assembly + intermediary</a>
//     <br / >
//     <a href="./lisp/">Lisp interpreter</a>

//     <h2>Code blog:</h2>
//     <div id="blogs"></div>
//     <p>You'll just have to wait and simmer while I prepare these</p>
//   </body>
// </html>

const response = await fetch("./home-data.json");
const data = await response.json();

const projectStructure = `<section>
  <a href="$1">$2</a> <br />
  <p>$3</p>
</section>`;

const blogStructure = `<a href="$1">$2</a> <br />`;

// generate html for projects
for (let i = 0; i < data.projects.paths.length; ++i)
  project.innerHtml += projectStructure
    .replace("$1", data.projects.paths[i])
    .replace("$2", data.projects.details[i].title)
    .replace("$3", data.projects.details[i].description);

// generate html for blog entries
for (let i = 0; i < data.blogs.paths.length; ++i)
  blogs.innerHtml += blogStructure
    .replace("$1", data.blogs.paths[i])
    .replace("$2", data.blogs.titles);
