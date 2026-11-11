import type { Request, Response } from 'express';

/**
 * Prefixo `__Host-`: o navegador só aceita o cookie se for Secure, sem Domain e com Path=/.
 * Impede que um subdomínio injete ou sobrescreva os cookies da aplicação.
 * (Navegadores tratam http://localhost como seguro, então funciona também em desenvolvimento.)
 */
export const SESSION_COOKIE = '__Host-sid';
export const CSRF_COOKIE = '__Host-csrf';

/** Sessão expira em 30 dias de qualquer forma, ou em 7 dias sem uso. */
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000;

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: SESSION_ABSOLUTE_MS });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
}

/** Cookie do token anti-CSRF: HttpOnly (a interface recebe o valor pelo corpo de GET /api/auth/csrf). */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE, token, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
}
