import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { githubImportSchema, type GithubContributionsDto, type GithubImportInput, type GithubReposDto } from '@studio/contracts';
import { Scope } from '../auth/decorators.js';
import { AppException } from '../common/problem.filter.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import { assertRefs } from '../modules/crud.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { inScope, type WorkspaceScope } from '../workspaces/workspace-scope.js';
import { GithubContributionsService } from './github-contributions.service.js';
import { GithubReposService } from './github-repos.service.js';

/** GitHub: gráfico de contribuições (D-37) e importação de repositórios como projetos (D-39). */
@Controller('workspaces/:workspaceId/github')
@UseGuards(WorkspaceMemberGuard)
export class GithubController {
  constructor(
    private readonly github: GithubContributionsService,
    private readonly repos: GithubReposService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('contributions')
  contributions(@Query('months') months?: string): Promise<GithubContributionsDto> {
    const m = months === '3' ? 3 : months === '6' ? 6 : 12;
    return this.github.contributions(m);
  }

  /** Repositórios disponíveis, marcando os que já viraram projeto neste workspace. */
  @Get('repos')
  async list(@Scope() scope: WorkspaceScope, @Query('fresh') fresh?: string): Promise<GithubReposDto> {
    if (!this.repos.configured) return { configured: false, data: [] };
    const { repos, failedOrgs } = await this.repos.list(Date.now(), fresh === '1');
    const linked = await this.prisma.db.project.findMany({
      where: inScope(scope, { githubRepoId: { in: repos.map((r) => r.id) } }),
      select: { id: true, githubRepoId: true },
    });
    const byRepo = new Map(linked.map((p) => [p.githubRepoId, p.id]));
    return { configured: true, data: repos.map((r) => ({ ...r, projectId: byRepo.get(r.id) ?? null })), failedOrgs };
  }

  /**
   * Cria um projeto por repositório escolhido. Os dados vêm do GitHub (não do navegador).
   * Organização → sempre "Trabalho profissional"; arquivado no GitHub → status Arquivado.
   * Repositório já importado é ignorado (sem duplicar).
   */
  @Post('import')
  async import(@Scope() scope: WorkspaceScope, @Body(new ZodPipe(githubImportSchema)) body: GithubImportInput): Promise<{ created: number; skipped: number }> {
    if (!this.repos.configured) throw new AppException(503, 'GITHUB_NOT_CONFIGURED', 'O GitHub ainda não está conectado neste servidor.');
    const { repos } = await this.repos.list();
    const byId = new Map(repos.map((r) => [r.id, r]));
    const items = [...new Map(body.items.map((i) => [i.repoId, i])).values()];
    for (const it of items) {
      if (!byId.has(it.repoId)) throw new AppException(422, 'GITHUB_REPO_NOT_FOUND', 'Um dos repositórios não foi encontrado no seu GitHub. Atualize a lista e tente de novo.');
      if (it.clientId) await assertRefs(this.prisma, scope, { clientId: it.clientId }, { clientId: 'client' });
    }
    const data = items.map((it) => {
      const r = byId.get(it.repoId)!;
      return {
        workspaceId: scope.workspaceId,
        name: r.name.slice(0, 160),
        description: r.description,
        category: r.org ? ('PROFESSIONAL_WORK' as const) : it.category,
        clientId: it.clientId ?? null,
        status: r.archived ? ('ARCHIVED' as const) : ('PLANNING' as const),
        githubRepoId: r.id,
        githubFullName: r.fullName,
        githubUrl: r.url,
        githubOrg: r.org,
        githubArchived: r.archived,
      };
    });
    // skipDuplicates + índice único (workspace, repositório): duas importações ao mesmo tempo não duplicam.
    const { count } = await this.prisma.db.project.createMany({ data, skipDuplicates: true });
    return { created: count, skipped: items.length - count };
  }
}
