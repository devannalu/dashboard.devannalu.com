import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { clampUserAgent, truncateIp } from '../auth/crypto.js';
import { PrismaService } from '../database/prisma.service.js';

/** Ações de segurança registradas (lista fechada: facilita filtrar e evita texto livre com dados pessoais). */
export type AuditAction =
  | 'setup.completed'
  | 'setup.rejected'
  | 'login.succeeded'
  | 'login.failed'
  | 'logout'
  | 'csrf.rejected';

export interface AuditEntry {
  action: AuditAction;
  userId?: string | null;
  workspaceId?: string | null;
  /** Só identificadores e motivos curtos. Nunca senha, token, e-mail digitado ou conteúdo. */
  metadata?: Record<string, string | number | boolean>;
}

/** `AuditLog` (E1-9): somente inserção. Falha ao gravar não derruba a requisição, mas fica no log. */
@Injectable()
export class AuditService {
  private readonly log = new Logger('Auditoria');

  constructor(private readonly prisma: PrismaService) {}

  async record(req: Request | null, entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.db.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId ?? null,
          workspaceId: entry.workspaceId ?? null,
          ip: truncateIp(req?.ip),
          userAgent: clampUserAgent(req?.header('user-agent')),
          metadata: entry.metadata ?? undefined,
        },
      });
    } catch (err) {
      this.log.error({ action: entry.action, error: err instanceof Error ? err.message : String(err) });
    }
  }
}
