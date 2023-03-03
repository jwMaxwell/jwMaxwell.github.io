const fs = require("fs");

const projectPaths = fs
  .readdirSync(".")
  .filter((title) => !title.includes(".") && title !== "blog")
  .map((t) => `./${t}/`);

const projectDetails = projectPaths.map((pp) =>
  JSON.parse(fs.readFileSync(`${pp}details.json`, "utf8"))
);

const blogPaths = fs
  .readdirSync("./blog")
  .filter((title) => title.includes("html"))
  .map((t) => `./blog/${t}`);

const blogTitles = blogPaths.map((bp) =>
  fs
    .readFileSync(bp, "utf8")
    .match(/<title>(.*?)<\/title>/g)
    .pop()
    .replace(/<(.*?)>/g, "")
);

const res = {
  projects: {
    paths: projectPaths,
    details: projectDetails,
  },
  blogs: {
    paths: blogPaths,
    titles: blogTitles,
  },
};

fs.writeFileSync("./home-data.json", JSON.stringify(res));

console.log(projectPaths, projectDetails, blogPaths, blogTitles);
