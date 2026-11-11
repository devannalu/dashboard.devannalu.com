import { ConsoleLogger, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { csrfProtection } from './auth/csrf.middleware.js';
import { requestContext } from './common/request-context.middleware.js';
import { EnvValidationError, parseEnv, type Env } from './config/env.js';
import { loadDotEnv } from './config/load-dotenv.js';

/** Configura a aplicação (usado também pelos testes e2e, para testar o app real). */
export function configureApp(app: INestApplication, env: Env): INestApplication {
  app.setGlobalPrefix('api');
  // IP real da cliente (limite de tentativas e auditoria): confia só nos proxies conhecidos à frente da API.
  (app.getHttpAdapter().getInstance() as { set(k: string, v: unknown): void }).set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use(requestContext);
  app.use(csrfProtection(env.APP_ORIGIN));
  app.enableShutdownHooks();
  if (env.NODE_ENV !== 'production') app.enableCors({ origin: env.APP_ORIGIN, credentials: true });
  return app;
}

async function bootstrap(): Promise<void> {
  loadDotEnv();
  let env: Env;
  try {
    env = parseEnv(process.env);
  } catch (err) {
    if (err instanceof EnvValidationError) {
      console.error(`\n[Annalu Studio OS] A API não foi iniciada.\n${err.message}\nConfira o arquivo .env (modelo em .env.example).\n`);
      process.exit(1);
    }
    throw err;
  }
  const logger = new ConsoleLogger({ json: env.NODE_ENV === 'production', logLevels: levelsFrom(env.LOG_LEVEL) });
  const app = await NestFactory.create(AppModule.forRoot(env), { logger });
  configureApp(app, env);
  await app.listen(env.PORT);
  logger.log(`API ouvindo em http://localhost:${env.PORT}/api`, 'Inicialização');
}

function levelsFrom(level: Env['LOG_LEVEL']) {
  const order = ['error', 'warn', 'log', 'debug', 'verbose'] as const;
  return order.slice(0, order.indexOf(level) + 1) as ('error' | 'warn' | 'log' | 'debug' | 'verbose')[];
}

if (process.env.VITEST === undefined) await bootstrap();
