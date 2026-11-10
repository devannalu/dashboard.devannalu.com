import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Problem } from '@studio/contracts';
import type { Request, Response } from 'express';

/** Códigos estáveis e mensagens em pt-BR para os status HTTP mais comuns. */
const DEFAULTS: Record<number, { code: string; title: string }> = {
  400: { code: 'BAD_REQUEST', title: 'Requisição inválida' },
  401: { code: 'UNAUTHENTICATED', title: 'Sessão necessária' },
  403: { code: 'FORBIDDEN', title: 'Acesso negado' },
  404: { code: 'NOT_FOUND', title: 'Não encontrado' },
  409: { code: 'CONFLICT', title: 'Conflito' },
  413: { code: 'PAYLOAD_TOO_LARGE', title: 'Conteúdo grande demais' },
  422: { code: 'UNPROCESSABLE', title: 'Dados inválidos' },
  429: { code: 'TOO_MANY_REQUESTS', title: 'Muitas tentativas' },
  500: { code: 'INTERNAL_ERROR', title: 'Erro interno' },
};

/** Exceção de domínio com código estável, para services lançarem erros já no formato da API. */
export class AppException extends HttpException {
  constructor(status: number, public readonly code: string, detail: string, public readonly fieldErrors?: Problem['errors']) {
    super(detail, status);
  }
}

/**
 * Converte qualquer erro em `application/problem+json` (RFC 9457).
 * Erros inesperados viram 500 genérico: detalhes e stack ficam só no log, nunca na resposta.
 */
@Catch()
export class ProblemFilter implements ExceptionFilter {
  private readonly log = new Logger('Erro');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const base = DEFAULTS[status] ?? { code: `HTTP_${status}`, title: 'Erro' };

    const problem: Problem = { type: 'about:blank', title: base.title, status, code: base.code, requestId: req.requestId };
    if (exception instanceof AppException) {
      problem.code = exception.code;
      problem.detail = exception.message;
      if (exception.fieldErrors) problem.errors = exception.fieldErrors;
    } else if (exception instanceof HttpException && status < 500) {
      const body = exception.getResponse();
      const msg = typeof body === 'string' ? body : (body as { message?: unknown }).message;
      if (typeof msg === 'string') problem.detail = status === 404 && msg.startsWith('Cannot ') ? 'O endereço solicitado não existe.' : msg;
    }
    if (status >= 500) {
      problem.detail = 'Algo deu errado do nosso lado. Tente novamente em instantes.';
      this.log.error({ requestId: req.requestId, path: req.originalUrl.split('?')[0], error: exception instanceof Error ? exception.stack : String(exception) });
    }
    res.status(status).type('application/problem+json').json(problem);
  }
}
