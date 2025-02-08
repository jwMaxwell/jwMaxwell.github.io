const response = await fetch("./home-data.json");
const { projects, blogs } = await response.json();

const projectSection = ({ path, title, description }) => `
  <section>
    <a href="${path}">${title}</a> <br />
    <p>${description}</p>
  </section>`;

const blogSection = ({ path, title }) =>
  `<a href="${path}">${title}</a> <br />`;

document.body.innerHTML += `
<h2 class="content">Code projects:</h2>
<div id="projects" class="content">${projects
  .map(projectSection)
  .join("")}</div>

<h2 class="content">Code blog:</h2>
<div id="blogs" class="content">${blogs.map(blogSection).join("")}</div>`;
