const fs = require('fs').promises;
const path = require('path');

const DEFAULT_CONFIG = {
  minifiers: {
    '.js': {
      default: {
        ecma: 2015,
        mangle: true,
        compress: true,
        format: {
          comments: false,
        },
      },
      fallback: {
        ecma: 2015,
        mangle: false,
        compress: false,
        format: {
          comments: true,
        },
      },
    },
    '.ts': {
      default: {
        ecma: 2015,
        parse: {
          typescript: true,
        },
        mangle: true,
        compress: true,
      },
      fallback: {
        ecma: 2015,
        parse: {
          typescript: true,
        },
        mangle: false,
        compress: false,
      },
    },
    '.tsx': {
      default: {
        ecma: 2015,
        parse: {
          typescript: true,
          jsx: true,
        },
        mangle: true,
        compress: true,
      },
      fallback: {
        ecma: 2015,
        parse: {
          typescript: true,
          jsx: true,
        },
        mangle: false,
        compress: false,
      },
    },
    '.json': {
      compress: true,
    },
    '.yaml': {
      noRefs: true,
    },
    '.yml': {
      noRefs: true,
    },
    '.toml': {
      compress: true,
    },
    '.xml': {
      pretty: false,
    },
    '.html': {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
    },
    '.css': {
      level: 2,
    },
  },
  include: [],
  exclude: [],
  watch: {
    ignored: [
      'node_modules',
      '.git',
      '.pnpm',
      '.cursorrules',
      '.cursorrules-template',
      'wrangler',
      '.env',
      '*lock.json',
      'contents.xml',
      'pnpm-lock.yaml',
      'ruler.js',
    ],
    persistent: true,
  },
};

async function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), '.cursorruler.json');
    const configFile = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(configFile);

    // Deep merge with default config
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      minifiers: {
        ...DEFAULT_CONFIG.minifiers,
        ...userConfig.minifiers,
      },
      watch: {
        ...DEFAULT_CONFIG.watch,
        ...userConfig.watch,
      },
    };
  } catch (err) {
    // If no config file exists, return default config
    if (err.code === 'ENOENT') {
      return DEFAULT_CONFIG;
    }
    throw err;
  }
}

module.exports = {
  loadConfig,
  DEFAULT_CONFIG,
};
