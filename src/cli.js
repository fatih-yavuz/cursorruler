#!/usr/bin/env node

const { program } = require('commander');
const { version } = require('../package.json');

program
  .version(version)
  .option('-i, --include <patterns...>', 'File patterns to include')
  .option('-e, --exclude <patterns...>', 'File patterns to exclude')
  .option('-w, --watch', 'Watch for file changes')
  .option('-r, --refresh', 'Auto-refresh every 5 seconds')
  .option('--no-gitignore', 'Ignore .gitignore patterns')
  .parse(process.argv);

const options = program.opts();

async function runWithRefresh() {
  try {
    await require('./index')(options);
    if (options.refresh) {
      setTimeout(runWithRefresh, 5000);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (options.refresh) {
      console.log('Retrying in 5 seconds...');
      setTimeout(runWithRefresh, 5000);
    } else {
      process.exit(1);
    }
  }
}

runWithRefresh();
