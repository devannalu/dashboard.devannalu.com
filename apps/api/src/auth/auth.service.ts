import { Inject, Injectable } from '@nestjs/common';
import type { DashboardLayout, loginInputSchema, Me, setupInputSchema } from '@studio/contracts';
import type { Request } from 'express';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { AppException } from '../common/problem.filter.js';
import { ENV, type Env } from '../config/env.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { safeEqual } from './crypto.js';
import { dummyVerify, hashPassword, passwordProblem, verifyPassword } from './password.js';
import { SessionService } from './session.service.js';

export interface SignedIn {
  token: string;
  me: Me;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
  ) {}

  // ---------- Primeiro acesso (E1-1) ----------

  /** Disponível só com OWNER_EMAIL e SETUP_TOKEN configurados e enquanto não existir nenhuma usuária. */
  async setupAvailable(): Promise<boolean> {
    if (!this.env.OWNER_EMAIL || !this.env.SETUP_TOKEN) return false;
    return (await this.prisma.db.user.count()) === 0;
  }

  async setup(req: Request, input: z.output<typeof setupInputSchema>): Promise<SignedIn> {
    if (!(await this.setupAvailable())) throw notFound();

    const emailOk = safeEqual(input.email, this.env.OWNER_EMAIL!);
    const tokenOk = safeEqual(input.setupToken, this.env.SETUP_TOKEN!);
    if (!emailOk || !tokenOk) {
      await this.audit.record(req, { action: 'setup.rejected' });
      throw new AppException(403, 'SETUP_REJECTED', 'E-mail ou token de configuração inválidos.');
    }
    this.assertStrong(input.password, input.email, input.name);

    const passwordHash = await hashPassword(input.password);
    const workspaceName = input.workspaceName ?? 'Meu estúdio';
    let userId: string;
    let workspaceId: string;
    try {
      ({ userId, workspaceId } = await this.prisma.db.$transaction(async (tx) => {
        // Reconfere dentro da transação; o e-mail único impede duas configurações simultâneas.
        if ((await tx.user.count()) > 0) throw notFound();
        const user = await tx.user.create({ data: { email: input.email, name: input.name, passwordHash, lastLoginAt: new Date() } });
        const ws = await tx.workspace.create({
          data: { name: workspaceName, slug: slugify(workspaceName), members: { create: { userId: user.id, role: 'OWNER' } } },
        });
        return { userId: user.id, workspaceId: ws.id };
      }));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw notFound();
      throw err;
    }

    const { token } = await this.sessions.create(userId, req);
    await this.audit.record(req, { action: 'setup.completed', userId, workspaceId });
    return { token, me: await this.me(userId) };
  }

  // ---------- Login e logout (E1-2) — sem bloqueio por tentativas (E1-4 retirado, D-34) ----------

  async login(req: Request, input: z.output<typeof loginInputSchema>): Promise<SignedIn> {
    const user = await this.prisma.db.user.findUnique({ where: { email: input.email } });

    if (!user?.passwordHash) {
      await dummyVerify(input.password);
      await this.audit.record(req, { action: 'login.failed', metadata: { reason: 'unknown_account' } });
      throw invalidCredentials();
    }

    if (!(await verifyPassword(user.passwordHash, input.password))) {
      await this.audit.record(req, { action: 'login.failed', userId: user.id, metadata: { reason: 'wrong_password' } });
      throw invalidCredentials();
    }

    await this.prisma.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const { token, sessionId } = await this.sessions.create(user.id, req);
    await this.audit.record(req, { action: 'login.succeeded', userId: user.id, metadata: { sessionId } });
    return { token, me: await this.me(user.id) };
  }

  async logout(req: Request, sessionId: string, userId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
    await this.audit.record(req, { action: 'logout', userId, metadata: { sessionId } });
  }

  async me(userId: string): Promise<Me> {
    const user = await this.prisma.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        timezone: true,
        weekStartsOn: true,
        themePreference: true,
        dashboardLayout: true,
        memberships: { select: { role: true, workspace: { select: { id: true, name: true, slug: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
    const { memberships, ...profile } = user;
    return { user: profile, workspaces: memberships.map((m) => ({ ...m.workspace, role: m.role })) };
  }

  /** Salva a disposição dos widgets do Início (já validada pelo controller). */
  async saveDashboardLayout(userId: string, layout: DashboardLayout): Promise<void> {
    await this.prisma.db.user.update({ where: { id: userId }, data: { dashboardLayout: layout } });
  }

  // ---------- Auxiliares ----------

  private assertStrong(password: string, email: string, name: string): void {
    const problem = passwordProblem(password, { email, name });
    if (problem) throw new AppException(422, 'WEAK_PASSWORD', problem, [{ path: 'password', message: problem }]);
  }
}

function notFound(): AppException {
  return new AppException(404, 'NOT_FOUND', 'O endereço solicitado não existe.');
}

function invalidCredentials(): AppException {
  return new AppException(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
}

export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'estudio';
}
