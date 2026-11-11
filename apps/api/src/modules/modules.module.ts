import { Module } from '@nestjs/common';
import { GithubContributionsService } from '../github/github-contributions.service.js';
import { GithubController } from '../github/github.controller.js';
import { ENV, type Env } from '../config/env.js';
import { FilesController } from './files.controller.js';
import { IdeasConvertController } from './ideas-convert.controller.js';
import { InsightsController } from './insights.controller.js';
import {
  ClientsController,
  EventsController,
  IdeasController,
  MilestonesController,
  NotesController,
  ProjectsController,
  TasksController,
} from './resources.js';

/** Módulos de negócio do MVP (D-35). Todas as rotas ficam em `workspaces/:workspaceId/...`. */
@Module({
  providers: [{ provide: GithubContributionsService, useFactory: (env: Env) => new GithubContributionsService(env), inject: [ENV] }],
  controllers: [
    GithubController,
    IdeasConvertController,
    InsightsController,
    FilesController,
    ClientsController,
    ProjectsController,
    MilestonesController,
    TasksController,
    EventsController,
    NotesController,
    IdeasController,
  ],
})
export class ModulesModule {}
