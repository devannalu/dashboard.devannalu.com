import { resolve } from 'node:path';
import { loadDotEnv } from '../src/config/load-dotenv.js';
import { parseEnv } from '../src/config/env.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { JobRunner } from '../src/jobs/job-runner.js';
import { JobsService } from '../src/jobs/jobs.service.js';

loadDotEnv(resolve(import.meta.dirname, '..'));
const env = parseEnv({ NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL });

describe('Fila de jobs (MySQL real)', () => {
  const prisma = new PrismaService(env);
  const jobs = new JobsService(prisma);

  beforeEach(async () => {
    await prisma.db.job.deleteMany();
  });

  afterAll(async () => {
    await prisma.db.job.deleteMany();
    await prisma.onModuleDestroy();
  });

  it('não duplica job com a mesma chave de idempotência', async () => {
    const a = await jobs.enqueue('teste', { n: 1 }, { dedupeKey: 'evento-42' });
    const b = await jobs.enqueue('teste', { n: 2 }, { dedupeKey: 'evento-42' });
    expect(b.id).toBe(a.id);
    expect(await prisma.db.job.count()).toBe(1);
  });

  it('dois workers ao mesmo tempo nunca pegam o mesmo job', async () => {
    await jobs.enqueue('teste', {});
    const [x, y] = await Promise.all([jobs.claimNext('w1'), jobs.claimNext('w2')]);
    const pegos = [x, y].filter(Boolean);
    expect(pegos).toHaveLength(1);
    expect(pegos[0]).toMatchObject({ status: 'RUNNING', attempts: 1 });
  });

  it('não pega job agendado para o futuro', async () => {
    await jobs.enqueue('teste', {}, { runAt: new Date(Date.now() + 60_000) });
    expect(await jobs.claimNext('w1')).toBeNull();
  });

  it('executa o handler e marca como concluído', async () => {
    const runner = new JobRunner(jobs);
    const recebidos: unknown[] = [];
    runner.register('eco', async (p) => {
      recebidos.push(p);
    });
    const job = await jobs.enqueue('eco', { ola: 'mundo' });
    expect(await runner.runOnce('w1')).toBe('succeeded');
    expect(recebidos).toEqual([{ ola: 'mundo' }]);
    expect((await prisma.db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe('SUCCEEDED');
  });

  it('falha → reagenda com espera e vira DEAD ao esgotar as tentativas', async () => {
    const runner = new JobRunner(jobs);
    runner.register('quebra', async () => {
      throw new Error('falhou de propósito');
    });
    const job = await jobs.enqueue('quebra', {}, { maxAttempts: 2 });

    expect(await runner.runOnce('w1')).toBe('retry');
    let atual = await prisma.db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(atual).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'Error: falhou de propósito' });
    expect(atual.runAt.getTime()).toBeGreaterThan(Date.now());

    await prisma.db.job.update({ where: { id: job.id }, data: { runAt: new Date(Date.now() - 1000) } });
    expect(await runner.runOnce('w1')).toBe('dead');
    atual = await prisma.db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(atual).toMatchObject({ status: 'DEAD', attempts: 2 });
  });

  it('devolve à fila job travado em RUNNING', async () => {
    const job = await jobs.enqueue('teste', {});
    await prisma.db.job.update({ where: { id: job.id }, data: { status: 'RUNNING', lockedAt: new Date(Date.now() - 3_600_000), lockedBy: 'morto' } });
    expect(await jobs.recoverStale()).toBe(1);
    expect((await prisma.db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe('PENDING');
  });
});
