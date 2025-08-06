module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.spec.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup.js'],
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
}; 