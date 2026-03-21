module.exports = {
  testEnvironment: 'node',
  testTimeout: 20000,
  verbose: true,
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: [],
  // Avoid transforming files (we rely on Node's ESM handling via
  // --experimental-vm-modules set in test-runner.js)
  transform: {}
};
