const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

/**
 * Reads and parses gitignore patterns
 * @returns {Promise<string[]>} Array of gitignore patterns
 */
async function getGitignorePatterns() {
  try {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');

    // More robust pattern filtering
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Ignore empty lines, comments, and leading/trailing whitespace
        return line && !line.startsWith('#') && !line.match(/^\s*$/);
      });
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('No .gitignore file found');
      return [];
    }
    console.error('Error reading .gitignore:', error);
    return [];
  }
}

async function generateProjectTree(include = [], exclude = []) {
  const defaultExcludes = [
    'node_modules',
    '.git',
    '.pnpm',
    '.cursorrules-template',
    '.cursorrules',
    '.cursorruler.config.json',
    'examples',
    '.wrangler',
  ];

  try {
    const treeCommand = [
      'tree',
      '-a',
      '--dirsfirst',
      ...defaultExcludes.concat(exclude).map(pattern => `-I "${pattern}"`),
      ...include.map(pattern => `-P "${pattern}"`),
      '--prune',
    ].join(' ');

    return execSync(treeCommand, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
  } catch (error) {
    if (error.status === 127) {
      throw new Error('tree command not found. Please install tree utility.');
    }
    throw new Error(`Failed to generate project tree: ${error.message}`);
  }
}


function shouldIncludeFile(filePath, includes = [], excludes = []) {
  const basename = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);

  // Check for node_modules
  if (relativePath.includes('node_modules')) {
    return false;
  }

  // Check special files to exclude
  const specialFiles = new Set([
    '.cursorrules',
    '.cursorrules-template',
    '.cursorignore',
    '.git',
    '.pnpm',
    'contents.xml',
    'pnpm-lock.yaml',
    '.DS_Store',
    'Thumbs.db'
  ]);
  if (specialFiles.has(basename)) {
    return false;
  }

  // Check for temporary and backup files
  const tempPatterns = [
    '/tmp/',
    '-lock',
    'prompt',
    '\\.swp$',
    '\\.tmp$',
    '~$'
  ];
  if (tempPatterns.some(pattern => new RegExp(pattern).test(basename))) {
    return false;
  }

  // Check exclude patterns first
  if (excludes.length > 0 && excludes.some(pattern => {
    const regex = createPattern(pattern);
    return regex && regex.test(relativePath);
  })) {
    return false;
  }

  // If no includes specified, include all files
  if (includes.length === 0) {
    return true;
  }

  // Check include patterns
  return includes.some(pattern => {
    const regex = createPattern(pattern);
    return regex && regex.test(relativePath);
  });
}

function optimizeWhitespace(content) {
  if (typeof content !== 'string') {
    console.warn('Non-string content provided to optimizeWhitespace');
    return '';
  }

  try {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  } catch (error) {
    console.error('Error optimizing whitespace:', error);
    return content;
  }
}

const createPattern = pattern => {
  try {
    pattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\//g, '[\\/]');
    return new RegExp(`^${pattern}`);
  } catch (error) {
    console.warn(`Invalid pattern: ${pattern}`, error);
    return false;
  }
};

function isValidFileContent(_content, _filePath) {
  return true;
}

module.exports = {
  getGitignorePatterns,
  generateProjectTree,
  shouldIncludeFile,
  optimizeWhitespace,
  isValidFileContent,
};
