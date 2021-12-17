const {pipe, map, filter, both, sort} = require('ramda');
const fs = require('fs');
const {resolve} = require('path');

const fileExists = (filename) => (filePath) =>
  fs.existsSync(resolve(__dirname, filePath + '/' + filename));

pipe(
  () => fs.readdirSync('.'),
  filter(both(fileExists('README.md'), fileExists('index.html'))),
  map((filePath) => {
    const [title, desc = ''] = fs
      .readFileSync(filePath + '/README.md')
      .toString()
      .trim()
      .split(' - ');
    return {filePath, title, desc};
  }),
  (data) => fs.writeFileSync('./home/dat.json', JSON.stringify(data, null, 2))
)();