import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const VALID_ID = /^[A-Za-z0-9-]{8,64}$/;
const log = new Logger('HTTP');

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Atribui um `requestId` (reaproveita o do proxy se for válido), devolve no header
 * e registra uma linha por requisição.
 * Segurança: registra só método, caminho SEM query string, status e duração.
 * Nunca registra headers, cookies, corpo ou parâmetros (podem conter tokens e dados pessoais).
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  req.requestId = id;
  res.setHeader('x-request-id', id);
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const path = req.originalUrl.split('?')[0];
    log.log({ requestId: id, method: req.method, path, status: res.statusCode, ms: Math.round(ms) });
  });
  next();
}
