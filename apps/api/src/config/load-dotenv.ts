import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Carrega o `.env` da raiz do monorepo (procura subindo a partir deste arquivo).
 * Variáveis já definidas no ambiente têm prioridade (comportamento do Node).
 * Em produção, as variáveis vêm do ambiente do servidor e normalmente não há `.env`.
 */
export function loadDotEnv(start = import.meta.dirname): string | null {
  let dir = start;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate) && existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      process.loadEnvFile(candidate);
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
