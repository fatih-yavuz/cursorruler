const { minify: terserMinify } = require('terser');
const { minify: htmlMinify } = require('html-minifier-terser');
const yaml = require('js-yaml');
const TOML = require('toml');
const CleanCSS = require('clean-css');
const xmlbuilder = require('xmlbuilder');
const { minifyTypescript } = require('./tsUtils');

async function tryMinify(content, minifier, type, options) {
  try {
    return await minifier(content, options.default);
  } catch (error) {
    console.warn(
      `Primary ${type} minification failed, trying intermediate fallback:`,
      error.message
    );

    try {
      return await minifier(content, {
        ...options.default,
        mangle: false,
        compress: {
          ...options.default.compress,
          sequences: false,
          dead_code: false,
        },
      });
    } catch (error) {
      console.warn(
        `Intermediate ${type} minification failed, trying safe fallback:`,
        error.message
      );

      try {
        return await minifier(content, options.fallback);
      } catch (error) {
        console.error(`All ${type} minification strategies failed:`, error.message);
        return content.replace(/^\s+|\s+$/gm, '').replace(/[\r\n]+/g, '\n');
      }
    }
  }
}

function regexMinify(content, fileType) {
  // Remove comments
  content = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

  // Remove whitespace
  content = content.replace(/\s+/g, ' ').trim();

  // Additional file-type specific regex
  switch (fileType) {
    case '.js':
    case '.ts':
    case '.tsx':
      content = content
        .replace(/;\s*/g, ';')
        .replace(/{\s*/g, '{')
        .replace(/}\s*/g, '}')
        .replace(/,\s*/g, ',')
        .replace(/\s*:\s*/g, ':');
      break;
    case '.json':
      // Remove all whitespace for JSON
      content = content.replace(/\s/g, '');
      break;
  }

  return content;
}

async function createMinifiers(config) {
  const cleanCss = new CleanCSS();

  return {
    '.js': async content => {
      if (!content?.trim()) {
        return content;
      }
      try {
        const result = await tryMinify(
          content,
          async (code, options) => (await terserMinify(code, options)).code,
          'JavaScript',
          config.minifiers['.js']
        );
        return result;
      } catch (error) {
        console.warn('Falling back to regex minification for JS');
        return regexMinify(content, '.js');
      }
    },

    '.ts': async content => {
      if (!content?.trim()) {
        return content;
      }
      try {
        const result = await tryMinify(
          content,
          async (code, options) => await minifyTypescript(code, options),
          'TypeScript',
          config.minifiers['.ts']
        );
        return result;
      } catch (error) {
        console.warn('Falling back to regex minification for TS');
        return regexMinify(content, '.ts');
      }
    },

    '.tsx': async content => {
      if (typeof content !== 'string' || !content.trim()) {
        return content;
      }
      return tryMinify(
        content,
        async (code, opts) => await minifyTypescript(code, opts, true),
        'TypeScript',
        config.minifiers['.tsx']
      );
    },
    '.json': content => {
      try {
        // Remove comments before parsing
        const cleanJson = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
        // Parse and re-stringify with minimal whitespace
        const parsed = JSON.parse(cleanJson);
        return JSON.stringify(parsed, null, 0);
      } catch (err) {
        return content;
      }
    },
    '.yaml': content => {
      try {
        const doc = yaml.load(content);
        return yaml.dump(doc, {
          noRefs: true,
          quotingType: '"',
          forceQuotes: false,
          indent: 0,
        });
      } catch (err) {
        return content;
      }
    },
    '.yml': content => {
      return this['.yaml'](content);
    },
    '.toml': content => {
      try {
        // Remove comments and empty lines
        const cleanContent = content
          .split('\n')
          .filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('#');
          })
          .join('\n');

        // Parse and re-stringify to ensure valid TOML
        const parsed = TOML.parse(cleanContent);

        // Convert back to TOML format but minified
        return Object.entries(parsed)
          .map(([key, value]) => {
            if (typeof value === 'object') {
              return `[${key}]\n${Object.entries(value)
                .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                .join('\n')}`;
            }
            return `${key}=${JSON.stringify(value)}`;
          })
          .join('\n');
      } catch (err) {
        return content;
      }
    },
    '.xml': content => {
      try {
        const doc = xmlbuilder.create(content);
        return doc.end({ pretty: false });
      } catch (err) {
        return content;
      }
    },
    '.html': async content => {
      try {
        return await htmlMinify(content, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true,
        });
      } catch (err) {
        return content;
      }
    },
    '.css': content => {
      try {
        return cleanCss.minify(content).styles;
      } catch (err) {
        return content;
      }
    },
    '.md': content => content,
    '.txt': content => content,
  };
}

module.exports = { createMinifiers, regexMinify };
