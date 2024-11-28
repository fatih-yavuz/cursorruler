const terser = require('terser');
const ts = require('typescript');

async function minifyTypescript(code, options, isJSX = false) {
  const compilerOptions = {
    ...options,
    declaration: true, // Generate type declarations
    emitDeclarationOnly: false, // Emit both JS and declarations
    jsx: isJSX ? ts.JsxEmit.Preserve : undefined,
    removeComments: true,
  };

  const result = ts.transpileModule(code, {
    compilerOptions,
    fileName: isJSX ? 'file.tsx' : 'file.ts',
  });

  // Extract the JS code from the output
  const jsCode = result.outputText;

  // Minify the JS code with Terser, preserving comments
  const minifiedJS = await terser.minify(jsCode, {
    format: {
      comments: true, // Preserve comments for type annotations
    },
    ecma: 2020, // or later, to support modern JS features including JSX
    parse: {
      ecma: 2020, // Ensure the parser understands JSX
    },
    compress: {
      // ... your compression options
    },
    mangle: {
      // ... your mangling options
    },
    output: {
      comments: true, // Preserve comments for type annotations
    },
  });

  return minifiedJS.code;
}

module.exports = { minifyTypescript };
