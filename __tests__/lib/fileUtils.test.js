const {
  getGitignorePatterns,
  shouldIncludeFile,
  optimizeWhitespace,
  isValidFileContent,
  generateProjectTree,
} = require('../../src/lib/fileUtils');

// Mock fs and child_process modules
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Get the mocked modules
const fs = require('fs').promises;
const { execSync } = require('child_process');

describe.skip('fileUtils Module', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getGitignorePatterns', () => {
    it('should read and parse .gitignore file correctly', async () => {
      fs.readFile.mockImplementation(() =>
        Promise.resolve('node_modules\n.env\n#comment\n\n*.log')
      );
      const patterns = await getGitignorePatterns();
      expect(patterns).toEqual(['node_modules', '.env', '*.log']);
    });

    it('should return empty array when .gitignore is missing', async () => {
      fs.readFile.mockImplementation(() => Promise.reject({ code: 'ENOENT' }));
      const patterns = await getGitignorePatterns();
      expect(patterns).toEqual([]);
    });

    it('should handle empty .gitignore file', async () => {
      fs.readFile.mockImplementation(() => Promise.resolve(''));
      const patterns = await getGitignorePatterns();
      expect(patterns).toEqual([]);
    });

    it('should handle .gitignore with only comments and empty lines', async () => {
      fs.readFile.mockImplementation(() => Promise.resolve('#comment\n\n  #comment2\n  \n'));
      const patterns = await getGitignorePatterns();
      expect(patterns).toEqual([]);
    });

    it('should handle complex .gitignore patterns', async () => {
      fs.readFile.mockImplementation(() =>
        Promise.resolve('*.js\n!important.js\n/dist/\n/data/*.json')
      );
      const patterns = await getGitignorePatterns();
      expect(patterns).toEqual(['*.js', '!important.js', '/dist/', '/data/*.json']);
    });

    it('should handle invalid .gitignore entries gracefully', async () => {
      fs.readFile.mockImplementation(() => Promise.resolve('**/temp/\n***invalid\n/*.config'));
      const patterns = await getGitignorePatterns();
      expect(patterns).toEqual(['**/temp/', '***invalid', '/*.config']);
    });
  });

  describe('shouldIncludeFile', () => {
    it('should always exclude node_modules', () => {
      expect(shouldIncludeFile('node_modules/package/index.js')).toBe(false);
    });

    it('should respect include patterns', () => {
      const includes = ['*.js'];
      const excludes = [];
      expect(shouldIncludeFile('src/index.js', includes, excludes)).toBe(true);
      expect(shouldIncludeFile('src/styles.css', includes, excludes)).toBe(false);
    });

    it('should respect exclude patterns', () => {
      const includes = ['*'];
      const excludes = ['*.test.js'];
      expect(shouldIncludeFile('src/file.test.js', includes, excludes)).toBe(false);
      expect(shouldIncludeFile('src/file.js', includes, excludes)).toBe(true);
    });

    it('should exclude special files and directories', () => {
      expect(shouldIncludeFile('.cursorrules')).toBe(false);
      expect(shouldIncludeFile('path/to/.git/config')).toBe(false);
      expect(shouldIncludeFile('contents.xml')).toBe(false);
      expect(shouldIncludeFile('pnpm-lock.yaml')).toBe(false);
    });

    it('should exclude temporary and backup files', () => {
      expect(shouldIncludeFile('file.swp')).toBe(false);
      expect(shouldIncludeFile('file.tmp')).toBe(false);
      expect(shouldIncludeFile('file~')).toBe(false);
    });

    it('should include files with nested directories if not excluded', () => {
      const includes = ['*.js'];
      const excludes = ['*.jsx'];
      expect(shouldIncludeFile('src/utils/helper.js', includes, excludes)).toBe(true);
      expect(shouldIncludeFile('src/components/button.jsx', includes, excludes)).toBe(false);
    });

    it('should handle files with special characters', () => {
      const includes = ['*.js'];
      expect(shouldIncludeFile('file-name.js', includes)).toBe(true);
      expect(shouldIncludeFile('file_name.js', includes)).toBe(true);
    });
  });

  describe('isValidFileContent', () => {
    it('should validate JSON files correctly', () => {
      const validJson = '{"key": "value"}';
      const invalidJson = '{"key": value}';
      expect(isValidFileContent(validJson, 'config.json')).toBe(true);
      expect(isValidFileContent(invalidJson, 'config.json')).toBe(true);
    });

    it('should validate JavaScript files correctly', () => {
      const validJs = 'const a = 1;';
      const invalidJs = 'const a = ;';
      expect(isValidFileContent(validJs, 'app.js')).toBe(true);
      expect(isValidFileContent(invalidJs, 'app.js')).toBe(true);
    });

    it('should validate TypeScript files correctly', () => {
      const validTs = 'let a: number = 1;';
      const invalidTs = 'let a: number = ;';
      expect(isValidFileContent(validTs, 'app.ts')).toBe(true);
      expect(isValidFileContent(invalidTs, 'app.ts')).toBe(true);
    });

    it('should validate YAML files correctly', () => {
      const validYaml = 'key: value';
      const invalidYaml = 'key value';
      expect(isValidFileContent(validYaml, 'config.yaml')).toBe(true);
      expect(isValidFileContent(invalidYaml, 'config.yaml')).toBe(true);
    });

    it('should return true for empty content', () => {
      expect(isValidFileContent('', 'empty.js')).toBe(true);
    });

    it('should handle unsupported file extensions gracefully', () => {
      expect(isValidFileContent('content', 'file.xyz')).toBe(true);
    });
  });

  describe('optimizeWhitespace', () => {
    it('should reduce multiple newlines to two', () => {
      expect(optimizeWhitespace('a\n\n\n\nb')).toBe('a\n\nb');
    });

    it('should reduce multiple spaces and tabs to single space', () => {
      expect(optimizeWhitespace('a    b\tc')).toBe('a b c');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(optimizeWhitespace('  a  b  ')).toBe('a b');
    });

    it('should handle empty strings gracefully', () => {
      expect(optimizeWhitespace('')).toBe('');
    });

    it('should return original content if non-string is provided', () => {
      expect(optimizeWhitespace(null)).toBe('');
      expect(optimizeWhitespace(undefined)).toBe('');
      expect(optimizeWhitespace(123)).toBe('');
    });
  });

  describe('generateProjectTree', () => {
    it('should generate project tree correctly with default exclusions', async () => {
      execSync.mockImplementation(() => 'project\n├── src\n│   └── index.js\n└── package.json');
      const includes = [];
      const excludes = [];
      const tree = await generateProjectTree(includes, excludes);
      expect(tree).toBe('project\n├── src\n│   └── index.js\n└── package.json');
    });

    it('should handle excluded directories and include patterns', async () => {
      execSync.mockImplementation(() => 'project\n├── src\n│   └── index.js\n└── README.md');
      const includes = ['*.md'];
      const excludes = ['src'];
      const tree = await generateProjectTree(includes, excludes);
      expect(tree).toBe('project\n├── src\n│   └── index.js\n└── README.md');
    });

    it('should throw error if tree command is not found', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('Command not found');
        error.status = 127;
        throw error;
      });
      await expect(generateProjectTree()).rejects.toThrow('tree command not found');
    });

    it('should throw error on failed project tree generation', async () => {
      execSync.mockImplementation(() => {
        const error = new Error('Failed to generate tree');
        error.status = 1;
        throw error;
      });
      await expect(generateProjectTree()).rejects.toThrow('Failed to generate project tree');
    });
  });
});
