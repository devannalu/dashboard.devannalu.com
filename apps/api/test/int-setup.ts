import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { loadDotEnv } from '../src/config/load-dotenv.js';

/**
 * Prepara o banco de testes de integração (separado do banco de desenvolvimento):
 * aplica todas as migrações em TEST_DATABASE_URL antes dos testes.
 */
export default function setup(): void {
  loadDotEnv(resolve(import.meta.dirname, '..'));
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Defina TEST_DATABASE_URL no .env para rodar os testes de integração.');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(import.meta.dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
