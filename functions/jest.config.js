/**
 * Testes do back-end. Rodam contra os emuladores do Firebase (Auth e Firestore),
 * iniciados pelo script "npm test" (firebase emulators:exec). Nada toca o projeto real.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  setupFiles: ['<rootDir>/test/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', target: 'es2022', esModuleInterop: true, strict: true, skipLibCheck: true } }],
  },
  testTimeout: 20000,
  collectCoverageFrom: [
    'src/**/*.ts',
    // index.ts só liga as funções aos gatilhos do Firebase; a lógica está em api.ts e triggers.ts
    '!src/index.ts',
  ],
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: { lines: 75, statements: 75, functions: 75, branches: 60 },
  },
};
