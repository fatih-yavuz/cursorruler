module.exports = {
  // ... other Jest config options

  preset: 'ts-jest', // or 'ts-jest/presets/default-esm' for ESM
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
  },
  // If you're using ESM, you'll likely need this:
  extensionsToTreatAsEsm: ['.ts', '.tsx'], // If using ESM
  moduleNameMapper: {
    // If you're using CSS Modules or other non-JS files in your tests
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};
