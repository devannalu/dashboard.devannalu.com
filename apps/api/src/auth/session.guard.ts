import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../common/problem.filter.js';
import { readCookie, SESSION_COOKIE } from './cookies.js';
import { IS_PUBLIC } from './decorators.js';
import { SessionService } from './session.service.js';

/**
 * Guard global (E2-2): resolve a usuária a partir do cookie de sessão.
 * Sem sessão válida → 401. Rotas marcadas com `@Public()` passam direto.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    const session = await this.sessions.resolve(readCookie(req, SESSION_COOKIE));
    if (!session) throw new AppException(401, 'UNAUTHENTICATED', 'Entre novamente para continuar.');
    req.auth = session;
    return true;
  }
}
