const fs = require('fs').promises;
const path = require('path');
const xmlbuilder = require('xmlbuilder');
const {
  getGitignorePatterns,
  generateProjectTree,
  shouldIncludeFile,
  optimizeWhitespace,
  isValidFileContent,
} = require('./lib/fileUtils');
const { loadConfig } = require('./lib/config');
const { createMinifiers, regexMinify } = require('./lib/minifiers');
const { createWatcher } = require('./lib/watcher');

async function generateContentsXML(options) {
  console.log('Starting to generate XML with options:', options);
  const rootDir = process.cwd();
  const xml = xmlbuilder.create('project', { encoding: 'utf-8' });
  const minifiers = await createMinifiers(options);

  async function processFile(filePath) {
    console.log('Processing file:', filePath);
    const relativePath = path.relative(rootDir, filePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Validate content before processing
      if (!isValidFileContent(content, filePath)) {
        console.warn(`Skipping invalid file: ${filePath}`);
        return;
      }

      const ext = path.extname(filePath);
      let processedContent = content;

      if (minifiers[ext]) {
        try {
          processedContent = await minifiers[ext](content);
        } catch (error) {
          console.warn(`Minification failed for ${filePath}, using original content`);
          // Use regex minification as last resort
          processedContent = regexMinify(content, ext);
        }
      }

      const escapedPath = relativePath.replace(/[[\]()]/g, '${project-code}amp;');
      xml
        .ele('file')
        .ele('filePath', {}, `./${escapedPath}`)
        .up()
        .ele('fileContent', {}, processedContent);
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
      // Skip this file but continue processing others
    }
  }

  async function scanDirectory(dir) {
    console.log('Scanning directory:', dir);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const excludedDirs = new Set(['node_modules', '.git', '.pnpm', '.wrangler']);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!excludedDirs.has(entry.name)) {
          await scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        if (shouldIncludeFile(fullPath, options.include, options.exclude)) {
          console.log('Found matching file:', fullPath);
          await processFile(fullPath);
        } else {
          console.log('Skipping file:', fullPath);
        }
      }
    }
  }

  await scanDirectory(rootDir);
  return xml.end({ pretty: true });
}

async function updateCursorRules(projectCode, projectTree) {
  console.log('Updating .cursorrules file');
  const templatePath = path.join(process.cwd(), '.cursorrules-template');
  const outputPath = path.join(process.cwd(), '.cursorrules');

  try {
    let template = await fs.readFile(templatePath, 'utf-8');
    console.log('Template file loaded');

    // Replace placeholders and optimize whitespace
    template = template.replace('${project-code}', projectCode);
    template = template.replace('${project-tree}', projectTree);
    template = optimizeWhitespace(template);

    await fs.writeFile(outputPath, template, 'utf-8');
    console.log('.cursorrules file updated successfully');
  } catch (error) {
    console.error('Error updating .cursorrules file:', error);
    throw error;
  }
}

async function main(cliOptions) {
  console.log('Starting with CLI options:', cliOptions);

  // Load config and merge with CLI options
  const config = await loadConfig();
  const options = {
    ...config,
    include: [...(config.include || []), ...(cliOptions.include || [])],
    exclude: [...(config.exclude || []), ...(cliOptions.exclude || [])],
    watch: cliOptions.watch || config.watch,
  };

  // Always load and apply .gitignore patterns unless explicitly disabled
  if (cliOptions.gitignore !== false) {
    const gitignorePatterns = await getGitignorePatterns();
    options.exclude = [...options.exclude, ...gitignorePatterns];
    console.log('Added gitignore patterns:', gitignorePatterns);
  }

  async function generate() {
    console.log('Starting generation process');
    try {
      const projectCode = await generateContentsXML(options);
      console.log('Project code XML generated');

      const projectTree = await generateProjectTree(options.include, options.exclude);
      console.log('Project tree generated');

      await updateCursorRules(projectCode, projectTree);
      console.log('Generated .cursorrules file successfully');
    } catch (error) {
      console.error('Error during generation:', error);
      throw error;
    }
  }

  await generate();

  if (options.watch) {
    console.log('Setting up file watcher...');
    createWatcher(options, () => {
      console.log('Change detected, regenerating...');
      generate().catch(error => {
        console.error('Error during regeneration:', error);
      });
    });
    console.log('Watching for changes...');
  }
}

module.exports = main;
