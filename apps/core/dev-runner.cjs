const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { register } = require('node:module');

const projectDir = __dirname;
register('ts-node/esm', pathToFileURL(path.join(projectDir, 'tsconfig.json')));

(async () => {
  try {
    const entry = pathToFileURL(path.join(projectDir, 'src/main.ts')).href;
    await import(entry);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  }
})();
