import { AppException } from '../common/problem.filter.js';
import type { MemberRole } from '../generated/prisma/enums.js';

declare const scopeBrand: unique symbol;

/**
 * Escopo de workspace (E2-3). Só o `WorkspaceMemberGuard` cria um — depois de confirmar que a usuária
 * da sessão é membro do workspace da rota. Todo método de repositório de negócio recebe um `WorkspaceScope`
 * como PRIMEIRO parâmetro: assim é impossível (pelo compilador) consultar sem filtrar por workspace.
 */
export interface WorkspaceScope {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: MemberRole;
  readonly [scopeBrand]: true;
}

/** Uso exclusivo do guard e dos testes. */
export function createScope(workspaceId: string, userId: string, role: MemberRole): WorkspaceScope {
  return Object.freeze({ workspaceId, userId, role }) as WorkspaceScope;
}

/**
 * Acrescenta o filtro de workspace a um `where` do Prisma.
 * Exemplo: `prisma.db.project.findFirst({ where: inScope(scope, { id }) })`
 * (use `findFirst`, não `findUnique`, para o filtro de workspace entrar na consulta).
 */
export function inScope<W extends object>(scope: WorkspaceScope, where?: W): W & { workspaceId: string } {
  return { ...(where ?? ({} as W)), workspaceId: scope.workspaceId };
}

/**
 * Recurso inexistente OU de outro workspace → o mesmo 404 (não revela que existe).
 * Exemplo: `const p = foundOr404(await repo.find(scope, id), 'Projeto')`
 */
export function foundOr404<T>(value: T | null | undefined, label = 'Recurso'): T {
  if (value == null) throw new AppException(404, 'NOT_FOUND', `${label} não encontrado.`);
  return value;
}
