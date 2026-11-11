import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { ProblemFilter } from './common/problem.filter.js';
import { ConfigModule } from './config/config.module.js';
import type { Env } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { ModulesModule } from './modules/modules.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [ConfigModule.forRoot(env), DatabaseModule, JobsModule, StorageModule, AuthModule, ModulesModule],
      controllers: [HealthController],
      providers: [{ provide: APP_FILTER, useClass: ProblemFilter }],
    };
  }
}
