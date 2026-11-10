import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { JobsService } from './jobs.service.js';

export type JobHandler = (payload: Prisma.JsonValue) => Promise<void>;

/**
 * Executa jobs da fila. Cada módulo registra seus handlers (ex.: 'pet.reminder', 'files.thumbnail').
 * O processo `worker` chama `runOnce` em laço; os testes chamam diretamente.
 */
@Injectable()
export class JobRunner {
  private readonly log = new Logger('Jobs');
  private readonly handlers = new Map<string, JobHandler>();

  constructor(private readonly jobs: JobsService) {}

  register(type: string, handler: JobHandler): void {
    if (this.handlers.has(type)) throw new Error(`Handler já registrado para "${type}"`);
    this.handlers.set(type, handler);
  }

  /** Processa um job, se houver. Retorna o resultado para o laço decidir se espera. */
  async runOnce(workerId: string): Promise<'idle' | 'succeeded' | 'retry' | 'dead'> {
    const job = await this.jobs.claimNext(workerId, [...this.handlers.keys()]);
    if (!job) return 'idle';
    const handler = this.handlers.get(job.type);
    try {
      if (!handler) throw new Error(`Sem handler para o tipo "${job.type}"`);
      await handler(job.payload);
      await this.jobs.complete(job.id);
      return 'succeeded';
    } catch (err) {
      const outcome = await this.jobs.fail(job, err);
      this.log.warn({ jobId: job.id, type: job.type, attempt: job.attempts, outcome });
      return outcome;
    }
  }
}
