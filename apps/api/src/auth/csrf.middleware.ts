import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { CSRF_COOKIE, readCookie } from './cookies.js';
import { safeEqual } from './crypto.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const log = new Logger('CSRF');

/**
 * Proteção CSRF (E1-3) para todo método que altera dados:
 * 1. Se o header `Origin` vier, precisa ser exatamente a origem da aplicação.
 * 2. O header `x-csrf-token` precisa ser igual ao cookie `__Host-csrf` (double-submit).
 * Falha → 403 problem+json. Vale também para login e primeiro acesso (evita "login CSRF").
 */
export function csrfProtection(appOrigin: string) {
  const allowed = new URL(appOrigin).origin;
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.header('origin');
    const cookie = readCookie(req, CSRF_COOKIE);
    const header = req.header('x-csrf-token');
    const originOk = !origin || origin === allowed;
    const tokenOk = !!cookie && !!header && safeEqual(cookie, header);
    if (originOk && tokenOk) return next();

    log.warn({ requestId: req.requestId, path: req.originalUrl.split('?')[0], reason: originOk ? 'token' : 'origin' });
    res.status(403).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Acesso negado',
      status: 403,
      code: 'CSRF_REJECTED',
      detail: 'A página ficou desatualizada. Recarregue e tente de novo.',
      requestId: req.requestId,
    });
  };
}
