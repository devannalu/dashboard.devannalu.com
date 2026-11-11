import { Controller, Get, UseGuards } from '@nestjs/common';
import type { WorkspaceSummary } from '@studio/contracts';
import { Scope } from '../auth/decorators.js';
import { PrismaService } from '../database/prisma.service.js';
import { WorkspaceMemberGuard } from './workspace-member.guard.js';
import { foundOr404, type WorkspaceScope } from './workspace-scope.js';

/**
 * Rotas do workspace. Modelo para todo módulo de negócio:
 * `@Controller('workspaces/:workspaceId/<recurso>')` + `@UseGuards(WorkspaceMemberGuard)` + `@Scope()`.
 */
@Controller('workspaces/:workspaceId')
@UseGuards(WorkspaceMemberGuard)
export class WorkspacesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@Scope() scope: WorkspaceScope): Promise<WorkspaceSummary> {
    const ws = foundOr404(
      await this.prisma.db.workspace.findUnique({ where: { id: scope.workspaceId }, select: { id: true, name: true, slug: true } }),
      'Workspace',
    );
    return { ...ws, role: scope.role };
  }
}
