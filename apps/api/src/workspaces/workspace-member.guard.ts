import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { PrismaService } from '../database/prisma.service.js';
import type { MemberRole } from '../generated/prisma/enums.js';
import { createScope } from './workspace-scope.js';

/**
 * Confirma que a usuária da sessão é membro do `:workspaceId` da rota (E2-2) e anexa o escopo.
 * Não é membro (ou o workspace não existe) → 404, para não revelar que o workspace existe.
 * Papel fora de `@RequireRole(...)` → 403 (a usuária já sabe que o workspace existe).
 * Uso: `@UseGuards(WorkspaceMemberGuard)` em controllers de `workspaces/:workspaceId/...`.
 */
@Injectable()
export class WorkspaceMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const workspaceId = req.params.workspaceId;
    if (!req.auth || typeof workspaceId !== 'string') throw new Error('WorkspaceMemberGuard exige sessão e :workspaceId na rota.');

    const member =
      workspaceId.length <= 32
        ? await this.prisma.db.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: req.auth.userId } },
            select: { role: true },
          })
        : null;
    if (!member) throw new AppException(404, 'NOT_FOUND', 'Workspace não encontrado.');

    const roles = this.reflector.getAllAndOverride<MemberRole[] | undefined>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (roles && !roles.includes(member.role)) throw new AppException(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');

    req.workspaceScope = createScope(workspaceId, req.auth.userId, member.role);
    return true;
  }
}
