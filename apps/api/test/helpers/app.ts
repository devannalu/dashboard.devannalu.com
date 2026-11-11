import { resolve } from 'node:path';
import type { INestApplication, LoggerService } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { SessionService } from '../../src/auth/session.service.js';
import { loadDotEnv } from '../../src/config/load-dotenv.js';
import { parseEnv, type Env } from '../../src/config/env.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { configureApp } from '../../src/main.js';

loadDotEnv(resolve(import.meta.dirname, '../..'));

export const APP_ORIGIN = 'http://localhost:3000';
export const OWNER_EMAIL = 'dona@exemplo.com.br';
export const SETUP_TOKEN = 'token-de-configuracao-de-teste-com-32-caracteres-ou-mais';

/** Guarda tudo o que a aplicação registraria em log (para conferir que senhas nunca aparecem). */
export class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  private push = (...args: unknown[]) => void this.lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
  log = this.push;
  error = this.push;
  warn = this.push;
  debug = this.push;
  verbose = this.push;
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  logger: CapturingLogger;
  env: Env;
  close(): Promise<void>;
}

/** Sobe a API real (mesma configuração de produção) contra o banco de testes (TEST_DATABASE_URL). */
export async function createTestApp(overrides: Record<string, string> = {}): Promise<TestApp> {
  const env = parseEnv({
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    APP_ORIGIN,
    OWNER_EMAIL,
    SETUP_TOKEN,
    ...overrides,
  });
  const logger = new CapturingLogger();
  const mod = await Test.createTestingModule({ imports: [AppModule.forRoot(env)] }).compile();
  const app = configureApp(mod.createNestApplication({ logger }), env);
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma, logger, env, close: () => app.close() };
}

/** Apaga as tabelas de identidade (ordem respeita as chaves estrangeiras). */
export async function resetIdentity(prisma: PrismaService): Promise<void> {
  await prisma.db.auditLog.deleteMany();
  await prisma.db.session.deleteMany();
  await prisma.db.workspaceMember.deleteMany();
  await prisma.db.workspace.deleteMany();
  await prisma.db.user.deleteMany();
}

/** Valor de um cookie a partir dos headers Set-Cookie da resposta. */
export function cookieFrom(res: request.Response, name: string): { value: string; attrs: string } | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const line = raw?.find((c) => c.startsWith(`${name}=`));
  if (!line) return undefined;
  const [pair, ...attrs] = line.split(';');
  return { value: decodeURIComponent(pair!.slice(name.length + 1)), attrs: attrs.join(';').trim() };
}

/**
 * Cliente de teste que se comporta como o navegador: guarda os cookies, busca o token CSRF
 * e manda a origem da aplicação nas mutações.
 */
export class Browser {
  private cookies = new Map<string, string>();
  private csrf?: string;

  /**
   * Cada navegador de teste tem um IP próprio, informado como faria o proxy (X-Forwarded-For),
   * para os limites por IP de um teste não afetarem os outros.
   */
  constructor(
    private readonly app: INestApplication,
    readonly ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`,
  ) {}

  private cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ');
  }

  private remember(res: request.Response): request.Response {
    const raw = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
    for (const line of raw) {
      const [pair, ...attrs] = line.split(';');
      const eq = pair!.indexOf('=');
      const name = pair!.slice(0, eq);
      const value = decodeURIComponent(pair!.slice(eq + 1));
      const expired = attrs.some((a) => /expires=thu, 01 jan 1970/i.test(a.trim()));
      if (expired || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
    return res;
  }

  async get(path: string): Promise<request.Response> {
    return this.remember(await request(this.app.getHttpServer()).get(path).set('Cookie', this.cookieHeader()).set('X-Forwarded-For', this.ip));
  }

  async post(path: string, body?: object): Promise<request.Response> {
    return this.mutate('post', path, body);
  }

  async patch(path: string, body?: object): Promise<request.Response> {
    return this.mutate('patch', path, body);
  }

  async delete(path: string): Promise<request.Response> {
    return this.mutate('delete', path);
  }

  /** Mutação como o navegador: token CSRF + origem da aplicação. Aceita anexo (multipart). */
  async mutate(method: 'post' | 'put' | 'patch' | 'delete', path: string, body?: object, attach?: { field: string; data: Buffer; name: string }): Promise<request.Response> {
    if (!this.csrf) this.csrf = (await this.get('/api/auth/csrf')).body.csrfToken as string;
    const req = request(this.app.getHttpServer())
      [method](path)
      .set('Cookie', this.cookieHeader())
      .set('X-Forwarded-For', this.ip)
      .set('Origin', APP_ORIGIN)
      .set('x-csrf-token', this.csrf);
    return this.remember(await (attach ? req.attach(attach.field, attach.data, attach.name) : req.send(body ?? {})));
  }

  cookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }
}

/**
 * Suíte de autorização cruzada (E2-4): cria DOIS workspaces, cada um com sua usuária e sessão.
 * Todo módulo de negócio novo deve usar isto para provar que A nunca enxerga dados de B (→ 404).
 */
export async function createTwoWorkspaces(t: TestApp): Promise<{ a: Tenant; b: Tenant }> {
  const sessions = t.app.get(SessionService);
  const fakeReq = { ip: '127.0.0.1', header: () => undefined } as unknown as Request;
  const make = async (label: string): Promise<Tenant> => {
    const suffix = `${label}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const user = await t.prisma.db.user.create({ data: { email: `${suffix}@exemplo.com.br`, name: `Usuária ${label}` } });
    const ws = await t.prisma.db.workspace.create({
      data: { name: `Workspace ${label}`, slug: suffix, members: { create: { userId: user.id, role: 'OWNER' } } },
    });
    const { token } = await sessions.create(user.id, fakeReq);
    const browser = new Browser(t.app);
    browser.setCookie('__Host-sid', token);
    return { userId: user.id, workspaceId: ws.id, browser };
  };
  return { a: await make('a'), b: await make('b') };
}

export interface Tenant {
  userId: string;
  workspaceId: string;
  /** Já autenticado como a usuária deste workspace. */
  browser: Browser;
}
