const projectStructure = `<section>
  <a href="$1">$2</a> <br />
  <p>$3</p>
</section>`;

const blogStructure = `<a href="$1">$2</a> <br />`;

const response = await fetch("./home-data.json").then((t) => {
  const data = t.json();

  // generate html for projects
  for (let i = 0; i < data.projects.paths.length; ++i)
    projects.innerHtml = projectStructure
      .replace("$1", data.projects.paths[i])
      .replace("$2", data.projects.details[i].title)
      .replace("$3", data.projects.details[i].description);

  // generate html for blog entries
  for (let i = 0; i < data.blogs.paths.length; ++i)
    blogs.innerHtml += blogStructure
      .replace("$1", data.blogs.paths[i])
      .replace("$2", data.blogs.titles);
});
