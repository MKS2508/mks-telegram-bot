/**
 * @fileoverview Bun test configuration
 * @see https://bun.sh/docs/test/configuration
 */

export default {
  // Test files matching pattern
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  // Files to ignore
  ignore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
  ],
  // Preload files before tests
  // preload: ['./test/setup.ts'],
  // Coverage configuration
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
