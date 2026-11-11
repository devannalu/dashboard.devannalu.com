import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditService } from '../audit/audit.service.js';
import { WorkspaceMemberGuard } from '../workspaces/workspace-member.guard.js';
import { WorkspacesController } from '../workspaces/workspaces.controller.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SessionGuard } from './session.guard.js';
import { SessionService } from './session.service.js';

/** Identidade e autorização (M2). O SessionGuard vale para TODAS as rotas (seguro por padrão). */
@Global()
@Module({
  controllers: [AuthController, WorkspacesController],
  providers: [AuthService, SessionService, AuditService, WorkspaceMemberGuard, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [AuditService, SessionService, WorkspaceMemberGuard],
})
export class AuthModule {}
