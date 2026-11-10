import { z } from 'zod';

/**
 * Variáveis de ambiente validadas na inicialização.
 * Se algo obrigatório faltar ou estiver inválido, a API não sobe (falha rápida com mensagem clara).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  /** Origem da interface web (mesma origem em produção, via proxy). */
  APP_ORIGIN: z.url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
  /** Opcional no M1 até o módulo de banco ser ligado; obrigatório em produção. */
  DATABASE_URL: z.string().startsWith('mysql://').optional(),

  /** Armazenamento de arquivos compatível com S3 (D-31: Garage na própria VPS). Todos ou nenhum. */
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default('garage'),
  S3_BUCKET: z.string().min(3).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;
export const ENV = Symbol('ENV');

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Configuração inválida:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(result.error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`));
  }
  const env = result.data;
  if (env.NODE_ENV === 'production' && !env.DATABASE_URL) {
    throw new EnvValidationError(['DATABASE_URL: obrigatória em produção']);
  }
  const s3 = { S3_ENDPOINT: env.S3_ENDPOINT, S3_BUCKET: env.S3_BUCKET, S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY };
  const missing = Object.entries(s3).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0 && missing.length < 4) {
    throw new EnvValidationError(missing.map((k) => `${k}: necessária quando o armazenamento S3 está configurado`));
  }
  return env;
}
