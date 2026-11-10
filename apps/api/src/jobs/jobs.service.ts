import { Injectable } from '@nestjs/common';
import { Prisma, type Job } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { retryDelayMs, safeErrorMessage } from './backoff.js';

export interface EnqueueOptions {
  /** Quando executar (padrão: agora). */
  runAt?: Date;
  /** Chave de idempotência: o mesmo evento nunca gera dois jobs. */
  dedupeKey?: string;
  maxAttempts?: number;
}

/**
 * Fila de jobs no MySQL (ADR-004).
 * Concorrência: `FOR UPDATE SKIP LOCKED` garante que um job pendente é reservado por um único worker.
 */
@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(type: string, payload: Prisma.InputJsonValue, opts: EnqueueOptions = {}): Promise<Job> {
    try {
      return await this.prisma.db.job.create({
        data: { type, payload, runAt: opts.runAt ?? new Date(), dedupeKey: opts.dedupeKey, maxAttempts: opts.maxAttempts ?? 6 },
      });
    } catch (e) {
      // Chave de idempotência repetida: devolve o job já existente em vez de duplicar.
      if (opts.dedupeKey && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return this.prisma.db.job.findUniqueOrThrow({ where: { dedupeKey: opts.dedupeKey } });
      }
      throw e;
    }
  }

  /** Reserva o próximo job vencido, ou devolve null se não houver. */
  async claimNext(workerId: string, types?: string[]): Promise<Job | null> {
    return this.prisma.db.$transaction(async (tx) => {
      const typeFilter = types?.length ? Prisma.sql`AND type IN (${Prisma.join(types)})` : Prisma.empty;
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM Job
        WHERE status = 'PENDING' AND runAt <= NOW(3) ${typeFilter}
        ORDER BY runAt ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`;
      const id = rows[0]?.id;
      if (!id) return null;
      return tx.job.update({
        where: { id },
        data: { status: 'RUNNING', lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } },
      });
    });
  }

  async complete(id: string): Promise<void> {
    await this.prisma.db.job.update({ where: { id }, data: { status: 'SUCCEEDED', finishedAt: new Date(), lockedAt: null, lockedBy: null, lastError: null } });
  }

  /** Falha: reagenda com espera crescente ou marca como DEAD ao esgotar as tentativas. */
  async fail(job: Pick<Job, 'id' | 'attempts' | 'maxAttempts'>, err: unknown, now = new Date()): Promise<'retry' | 'dead'> {
    const dead = job.attempts >= job.maxAttempts;
    await this.prisma.db.job.update({
      where: { id: job.id },
      data: {
        status: dead ? 'DEAD' : 'PENDING',
        runAt: dead ? undefined : new Date(now.getTime() + retryDelayMs(job.attempts)),
        finishedAt: dead ? now : null,
        lockedAt: null,
        lockedBy: null,
        lastError: safeErrorMessage(err),
      },
    });
    return dead ? 'dead' : 'retry';
  }

  /** Devolve à fila jobs presos em RUNNING (ex.: worker caiu no meio). */
  async recoverStale(olderThanMs = 10 * 60_000): Promise<number> {
    const r = await this.prisma.db.job.updateMany({
      where: { status: 'RUNNING', lockedAt: { lt: new Date(Date.now() - olderThanMs) } },
      data: { status: 'PENDING', lockedAt: null, lockedBy: null },
    });
    return r.count;
  }
}
