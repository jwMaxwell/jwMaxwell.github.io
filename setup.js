const fs = require('fs');

const res = {
  projects: fs
    .readdirSync('.')
    .filter((title) => !title.includes('.') && title !== 'blog')
    .map((t) => ({
      path: `./${t}/`,
      ...JSON.parse(fs.readFileSync(`./${t}/details.json`, 'utf8')),
    })),
  blogs: fs
    .readdirSync('./blog')
    .filter((title) => title.includes('html'))
    .map((t) => ({
      path: `./blog/${t}`,
      title: fs
        .readFileSync(`./blog/${t}`, 'utf8')
        .match(/(?:<title>)([^<]+)/)[1],
    })),
};

fs.writeFileSync('./home-data.json', JSON.stringify(res));