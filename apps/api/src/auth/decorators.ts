import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { MemberRole } from '../generated/prisma/enums.js';
import type { ActiveSession } from './session.service.js';
import type { WorkspaceScope } from '../workspaces/workspace-scope.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Preenchido pelo SessionGuard. */
      auth?: ActiveSession;
      /** Preenchido pelo WorkspaceMemberGuard nas rotas `/workspaces/:workspaceId/...`. */
      workspaceScope?: WorkspaceScope;
    }
  }
}

/**
 * Seguro por padrão: TODA rota exige sessão. `@Public()` libera explicitamente
 * (health, csrf, login, primeiro acesso).
 */
export const IS_PUBLIC = 'auth:public';
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Papéis aceitos na rota (Fase 3). Sem o decorator, qualquer membro do workspace passa. */
export const ROLES = 'auth:roles';
export const RequireRole = (...roles: MemberRole[]) => SetMetadata(ROLES, roles);

/** Sessão da requisição (garantida pelo SessionGuard em rotas não públicas). */
export const CurrentSession = createParamDecorator((_: unknown, ctx: ExecutionContext): ActiveSession => {
  const auth = ctx.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw new Error('CurrentSession usado em rota pública ou sem SessionGuard.');
  return auth;
});

/** Escopo do workspace da rota (garantido pelo WorkspaceMemberGuard). Passe-o para os repositórios. */
export const Scope = createParamDecorator((_: unknown, ctx: ExecutionContext): WorkspaceScope => {
  const scope = ctx.switchToHttp().getRequest<Request>().workspaceScope;
  if (!scope) throw new Error('Scope usado fora de rota com WorkspaceMemberGuard.');
  return scope;
});
