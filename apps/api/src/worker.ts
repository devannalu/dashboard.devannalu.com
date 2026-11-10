import { hostname } from 'node:os';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { EnvValidationError, parseEnv } from './config/env.js';
import { loadDotEnv } from './config/load-dotenv.js';
import { JobRunner } from './jobs/job-runner.js';
import { JobsService } from './jobs/jobs.service.js';

/**
 * Processo separado que executa a fila de jobs (mesmo código da API, sem servidor HTTP).
 * Uso: node dist/worker.js
 */
async function main(): Promise<void> {
  loadDotEnv();
  let env;
  try {
    env = parseEnv(process.env);
  } catch (err) {
    if (err instanceof EnvValidationError) {
      console.error(`\n[Annalu Studio OS] O worker não foi iniciado.\n${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
  if (!env.DATABASE_URL) {
    console.error('[Annalu Studio OS] O worker precisa de DATABASE_URL.');
    process.exit(1);
  }
  const logger = new ConsoleLogger({ json: env.NODE_ENV === 'production' });
  const app = await NestFactory.createApplicationContext(AppModule.forRoot(env), { logger });
  app.enableShutdownHooks();
  const runner = app.get(JobRunner);
  const jobs = app.get(JobsService);
  const workerId = `${hostname()}-${process.pid}`;
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  logger.log(`Worker ${workerId} iniciado`, 'Jobs');
  let lastRecovery = 0;
  while (!stopping) {
    if (Date.now() - lastRecovery > 60_000) {
      const n = await jobs.recoverStale();
      if (n) logger.warn(`${n} job(s) travado(s) devolvido(s) à fila`, 'Jobs');
      lastRecovery = Date.now();
    }
    const r = await runner.runOnce(workerId);
    if (r === 'idle') await new Promise((res) => setTimeout(res, 1000));
  }
  await app.close();
  logger.log('Worker encerrado', 'Jobs');
}

await main();
