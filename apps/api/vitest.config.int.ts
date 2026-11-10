import { defineConfig } from 'vitest/config';

// Testes de integração com MySQL real (banco separado: TEST_DATABASE_URL).
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.int-spec.ts'],
    globalSetup: ['./test/int-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
