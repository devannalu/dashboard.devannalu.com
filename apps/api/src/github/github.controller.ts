import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { GithubContributionsDto } from '@studio/contracts';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { GithubContributionsService } from './github-contributions.service.js';

/** Contribuições do GitHub para o gráfico do Início (exige sessão e ser membro do workspace). */
@Controller('workspaces/:workspaceId/github')
@UseGuards(WorkspaceMemberGuard)
export class GithubController {
  constructor(private readonly github: GithubContributionsService) {}

  @Get('contributions')
  contributions(@Query('months') months?: string): Promise<GithubContributionsDto> {
    const m = months === '3' ? 3 : months === '6' ? 6 : 12;
    return this.github.contributions(m);
  }
}
