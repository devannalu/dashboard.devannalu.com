import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ideaConvertSchema } from '@studio/contracts';
import type { z } from 'zod';
import { Scope } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { foundOr404, inScope, type WorkspaceScope } from '../workspaces/workspace-scope.js';

/**
 * Conversão ideia → projeto (E10-4) numa única transação: cria o projeto com a descrição da ideia,
 * move as notas da ideia para o projeto e marca a ideia como "Virou projeto" (somente leitura).
 * Nova conversão da mesma ideia → 409.
 */
@Controller('workspaces/:workspaceId/ideas/:id/convert')
@UseGuards(WorkspaceMemberGuard)
export class IdeasConvertController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async convert(
    @Scope() scope: WorkspaceScope,
    @Param('id') id: string,
    @Body(new ZodPipe(ideaConvertSchema)) body: z.output<typeof ideaConvertSchema>,
  ): Promise<{ projectId: string }> {
    return this.prisma.db.$transaction(async (tx) => {
      const idea = foundOr404(await tx.idea.findFirst({ where: inScope(scope, { id }) }), 'Ideia');
      if (idea.status === 'CONVERTED' || idea.convertedProjectId) throw new AppException(409, 'IDEA_ALREADY_CONVERTED', 'Esta ideia já virou projeto.');
      const project = await tx.project.create({
        data: { workspaceId: scope.workspaceId, name: body.name ?? idea.title, description: idea.description, category: body.category, status: 'PLANNING' },
      });
      // Condição no status evita duas conversões simultâneas.
      const { count } = await tx.idea.updateMany({ where: { id, workspaceId: scope.workspaceId, convertedProjectId: null }, data: { status: 'CONVERTED', convertedProjectId: project.id } });
      if (count === 0) throw new AppException(409, 'IDEA_ALREADY_CONVERTED', 'Esta ideia já virou projeto.');
      await tx.note.updateMany({ where: { workspaceId: scope.workspaceId, ideaId: id }, data: { projectId: project.id } });
      return { projectId: project.id };
    });
  }
}
