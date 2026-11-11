import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { ENV, type Env } from '../config/env.js';

/**
 * Opções padrão do driver mariadb via URL (não sobrescreve valores já informados):
 * - `connectionLimit`: tamanho do pool.
 * - `allowPublicKeyRetrieval`: o MySQL 8 usa `caching_sha2_password`; sem TLS, o driver precisa
 *   buscar a chave pública do servidor para autenticar. Sem isso, nenhuma conexão abre
 *   ("pool failed to retrieve a connection", active=0). Aceitável porque o banco fica em rede
 *   privada (Coolify/Docker); com TLS no banco, a opção não é usada.
 * - `connectTimeout`: falha rápida e clara em vez de esperar o tempo do pool.
 */
export function withDriverDefaults(url: string, limit: number): string {
  const u = new URL(url);
  const defaults: Record<string, string> = { connectionLimit: String(limit), allowPublicKeyRetrieval: 'true', connectTimeout: '5000' };
  for (const [k, v] of Object.entries(defaults)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
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
      ? new PrismaClient({ adapter: new PrismaMariaDb(withDriverDefaults(env.DATABASE_URL, 10)) })
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
