import { Body, Controller, Get, HttpCode, Post, Put, Req, Res } from '@nestjs/common';
import { dashboardLayoutSchema, loginInputSchema, setupInputSchema, type CsrfToken, type DashboardLayout, type Me } from '@studio/contracts';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { AppException } from '../common/problem.filter.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { AuthService } from './auth.service.js';
import { clearSessionCookie, CSRF_COOKIE, readCookie, setCsrfCookie, setSessionCookie } from './cookies.js';
import { randomToken } from './crypto.js';
import { CurrentSession, Public } from './decorators.js';
import type { ActiveSession } from './session.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Token anti-CSRF: a interface guarda em memória e envia em `x-csrf-token` nas mutações. */
  @Public()
  @Get('csrf')
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response): CsrfToken {
    const current = readCookie(req, CSRF_COOKIE);
    const token = current && /^[A-Za-z0-9_-]{43}$/.test(current) ? current : randomToken();
    setCsrfCookie(res, token);
    res.setHeader('cache-control', 'no-store');
    return { csrfToken: token };
  }

  /** 200 enquanto o primeiro acesso está disponível; 404 para sempre depois. */
  @Public()
  @Get('setup')
  async setupStatus(): Promise<{ available: true }> {
    if (!(await this.auth.setupAvailable())) throw new AppException(404, 'NOT_FOUND', 'O endereço solicitado não existe.');
    return { available: true };
  }

  @Public()
  @Post('setup')
  async setup(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodPipe(setupInputSchema)) body: z.output<typeof setupInputSchema>,
  ): Promise<Me> {
    const { token, me } = await this.auth.setup(req, body);
    setSessionCookie(res, token);
    return me;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body(new ZodPipe(loginInputSchema)) body: z.output<typeof loginInputSchema>,
  ): Promise<Me> {
    const { token, me } = await this.auth.login(req, body);
    setSessionCookie(res, token);
    return me;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentSession() session: ActiveSession): Promise<void> {
    await this.auth.logout(req, session.sessionId, session.userId);
    clearSessionCookie(res);
  }

  /** Disposição dos widgets do Início, salva na conta (vale em qualquer navegador). */
  @Put('me/dashboard')
  @HttpCode(204)
  async saveDashboard(@CurrentSession() session: ActiveSession, @Body(new ZodPipe(dashboardLayoutSchema)) body: DashboardLayout): Promise<void> {
    await this.auth.saveDashboardLayout(session.userId, body);
  }

  @Get('me')
  me(@CurrentSession() session: ActiveSession): Promise<Me> {
    return this.auth.me(session.userId);
  }
}
