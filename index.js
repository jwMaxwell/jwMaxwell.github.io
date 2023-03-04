const response = await fetch("./home-data.json");
const data = await response.json();

const projectStructure = `<section>
<a href="$1">$2</a> <br />
<p>$3</p>
</section>`;

const blogStructure = `<a href="$1">$2</a> <br />`;

const populate = async () => {
  // generate html for projects
  for (let i = 0; i < data.projects.paths.length; ++i)
    projects.innerHTML = projectStructure
      .replace("$1", data.projects.paths[i])
      .replace("$2", data.projects.details[i].title)
      .replace("$3", data.projects.details[i].description);

  // generate html for blog entries
  for (let i = 0; i < (await data.blogs.paths.length); ++i)
    blogs.innerHTML += blogStructure
      .replace("$1", await data.blogs.paths[i])
      .replace("$2", await data.blogs.titles);
};

populate();
