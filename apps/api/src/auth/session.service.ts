import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from './cookies.js';
import { clampUserAgent, randomToken, sha256, truncateIp } from './crypto.js';

export interface ActiveSession {
  sessionId: string;
  userId: string;
}

/** Atualiza `lastSeenAt` no máximo a cada 5 minutos (evita uma escrita por requisição). */
const TOUCH_EVERY_MS = 5 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cria uma sessão nova (token novo a cada login: rotação). Retorna o token para o cookie. */
  async create(userId: string, req: Request): Promise<{ token: string; sessionId: string }> {
    const token = randomToken();
    const now = Date.now();
    const session = await this.prisma.db.session.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(now + SESSION_ABSOLUTE_MS),
        ip: truncateIp(req.ip),
        userAgent: clampUserAgent(req.header('user-agent')),
      },
    });
    return { token, sessionId: session.id };
  }

  /** Resolve o token do cookie. Sessão revogada, expirada ou parada há 7 dias → null. */
  async resolve(token: string | undefined): Promise<ActiveSession | null> {
    if (!token || token.length > 100) return null;
    const session = await this.prisma.db.session.findUnique({ where: { tokenHash: sha256(token) } });
    if (!session || session.revokedAt) return null;
    const now = Date.now();
    if (session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() + SESSION_IDLE_MS <= now) return null;
    if (now - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
      await this.prisma.db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
    }
    return { sessionId: session.id, userId: session.userId };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.db.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
