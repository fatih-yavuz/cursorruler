const chokidar = require('chokidar');
const { shouldIncludeFile } = require('./fileUtils');

function createWatcher(options, callback) {
  // Create a combined ignore patterns array
  const ignoredPatterns = [
    /(^|[/\\])\../, // dot files
    '**/node_modules/**',
    '**/.git/**',
    '**/.pnpm/**',
    '.cursorrules',
    'contents.xml',
    'pnpm-lock.yaml',
    ...(options.exclude || []),
  ];

  const watcher = chokidar.watch('.', {
    ignored: ignoredPatterns,
    persistent: true,
    ignoreInitial: true,
    followSymlinks: false,
  });

  watcher.on('change', async filePath => {
    if (shouldIncludeFile(filePath, options.include, options.exclude)) {
      await callback(filePath);
    }
  });

  return watcher;
}

module.exports = { createWatcher };
