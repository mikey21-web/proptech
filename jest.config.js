/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/ui.test.ts', 'e2e\\.'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    'middleware.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageDirectory: 'coverage',
  // Fast execution: 5s timeout for unit tests
  testTimeout: 5000,
  // Deterministic test ordering
  randomize: false,
};
