import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthCheckSchema, problemSchema } from '@studio/contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Public } from '../src/auth/decorators.js';
import { AppException } from '../src/common/problem.filter.js';
import { parseEnv } from '../src/config/env.js';
import { configureApp } from '../src/main.js';

@Public()
@Controller('teste-erros')
class ErrosController {
  @Get('inesperado')
  inesperado(): never {
    throw new Error('segredo interno: senha=123');
  }

  @Get('dominio')
  dominio(): never {
    throw new AppException(409, 'NOTE_VERSION_CONFLICT', 'Esta nota foi alterada em outra aba.');
  }
}

describe('API base (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const env = parseEnv({ NODE_ENV: 'test' });
    const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(env)], controllers: [ErrosController] }).compile();
    app = configureApp(mod.createNestApplication({ logger: false }), env);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde no contrato e devolve x-request-id', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(healthCheckSchema.parse(res.body).status).toBe('ok');
    expect(res.headers['x-request-id']).toMatch(/^[A-Za-z0-9-]{8,64}$/);
  });

  it('reaproveita x-request-id válido vindo do proxy', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').set('x-request-id', 'abc12345-proxy').expect(200);
    expect(res.headers['x-request-id']).toBe('abc12345-proxy');
  });

  it('rota inexistente vira problem+json 404 em pt-BR', async () => {
    const res = await request(app.getHttpServer()).get('/api/nao-existe').expect(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    const p = problemSchema.parse(res.body);
    expect(p).toMatchObject({ code: 'NOT_FOUND', title: 'Não encontrado' });
    expect(p.requestId).toBeTruthy();
  });

  it('erro inesperado vira 500 genérico sem vazar detalhes', async () => {
    const res = await request(app.getHttpServer()).get('/api/teste-erros/inesperado').expect(500);
    expect(JSON.stringify(res.body)).not.toContain('senha');
    expect(res.body.code).toBe('INTERNAL_ERROR');
  });

  it('erro de domínio mantém código estável e mensagem', async () => {
    const res = await request(app.getHttpServer()).get('/api/teste-erros/dominio').expect(409);
    expect(res.body).toMatchObject({ code: 'NOTE_VERSION_CONFLICT', detail: 'Esta nota foi alterada em outra aba.' });
  });
});
