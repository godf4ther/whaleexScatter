const fs = require('fs-extra');

const filePath = './dist/WhaleexScatter_min.js';

async function doConvert() {
  const js = await fs.readFile(filePath, 'utf-8');
  const json = `module.exports = ${JSON.stringify(js)};`;
  await fs.writeFile('./demo/inject/WhaleexScatter.js', json);
}

doConvert();
