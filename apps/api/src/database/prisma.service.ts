import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { ENV, type Env } from '../config/env.js';

/** Limite do pool via parâmetro da URL do driver mariadb (não sobrescreve um valor já informado). */
function withPoolLimit(url: string, limit: number): string {
  const u = new URL(url);
  if (!u.searchParams.has('connectionLimit')) u.searchParams.set('connectionLimit', String(limit));
  return u.toString();
}

/**
 * Uma única instância do Prisma por processo (cada instância tem seu pool de conexões).
 * Sem DATABASE_URL (permitido só fora de produção no M1), o banco fica "não configurado".
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly log = new Logger('Banco');
  readonly client: PrismaClient | null;

  constructor(@Inject(ENV) env: Env) {
    this.client = env.DATABASE_URL
      ? new PrismaClient({ adapter: new PrismaMariaDb(withPoolLimit(env.DATABASE_URL, 10)) })
      : null;
    if (!this.client) this.log.warn('DATABASE_URL não definida: recursos de banco desativados.');
  }

  get db(): PrismaClient {
    if (!this.client) throw new Error('Banco de dados não configurado (DATABASE_URL ausente).');
    return this.client;
  }

  /** Verificação de saúde: consulta trivial com limite de tempo. */
  async ping(timeoutMs = 2000): Promise<'ok' | 'down' | 'skipped'> {
    if (!this.client) return 'skipped';
    try {
      await Promise.race([
        this.client.$queryRaw`SELECT 1`,
        new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), timeoutMs)),
      ]);
      return 'ok';
    } catch {
      return 'down';
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.$disconnect();
  }
}
