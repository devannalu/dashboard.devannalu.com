import { Global, Module } from '@nestjs/common';
import { JobRunner } from './job-runner.js';
import { JobsService } from './jobs.service.js';

@Global()
@Module({ providers: [JobsService, JobRunner], exports: [JobsService, JobRunner] })
export class JobsModule {}
