# CursorRuler

A CLI tool to generate .cursorrules files for your projects.

## Installation

```bash
pnpm add -D cursorruler
```

## Usage

```bash
npx cursorruler -i '.js' -i '.json' -e '.ts' -e '.tsx'
```

## Options

- `-i, --include <patterns...>`: File patterns to include
- `-e, --exclude <patterns...>`: File patterns to exclude
- `-w, --watch`: Watch for file changes
- `--no-gitignore`: Ignore .gitignore patterns

## Configuration

You can customize the behavior by creating a `.cursorruler.json` file in your project root:

```json
{
  "minifiers": {
    ".js": {
      "ecma": 2020,
      "mangle": true,
      "compress": {
        "drop_console": true
      }
    }
  }
}
```

## Supported File Types

The following file types are supported for minification:

- JavaScript (.js)
- TypeScript (.ts)
- TypeScript React (.tsx)
- JSON (.json)
- Markdown (.md)
- Text (.txt)

## Development

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Run tests: `pnpm test`

## License

ISC
# cursorruler
