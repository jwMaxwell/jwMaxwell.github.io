const response = await fetch('./home-data.json');
const {projects, blogs} = await response.json();

const projectSection = ({path, title, description}) => `
  <section>
    <a href="${path}">${title}</a> <br />
    <p>${description}</p>
  </section>`;

const blogSection = ({path, title}) => `<a href="${path}">${title}</a> <br />`;

document.body.innerHTML += `
<h2>Code projects:</h2>
<div id="projects">${projects.map(projectSection).join('')}</div>

<h2>Code blog:</h2>
<div id="blogs">${blogs.map(blogSection).join('')}</div>`;