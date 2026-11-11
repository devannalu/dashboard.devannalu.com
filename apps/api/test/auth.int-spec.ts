import { meSchema } from '@studio/contracts';
import request from 'supertest';
import { sha256 } from '../src/auth/crypto.js';
import { Browser, cookieFrom, createTestApp, createTwoWorkspaces, OWNER_EMAIL, resetIdentity, SETUP_TOKEN, type TestApp } from './helpers/app.js';

const SENHA = 'cereja bordô no ateliê 42';
const setupBody = (extra: object = {}) => ({ email: OWNER_EMAIL, setupToken: SETUP_TOKEN, name: 'Dona Teste', password: SENHA, ...extra });

describe('Autenticação (MySQL real)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await resetIdentity(t.prisma);
  });
  afterAll(async () => {
    await resetIdentity(t.prisma);
    await t.close();
  });

  async function setupOwner(): Promise<Browser> {
    const b = new Browser(t.app);
    const res = await b.post('/api/auth/setup', setupBody());
    expect(res.status).toBe(201);
    return b;
  }

  describe('Primeiro acesso (E1-1)', () => {
    it('fica disponível enquanto não existe usuária', async () => {
      await request(t.app.getHttpServer()).get('/api/auth/setup').expect(200, { available: true });
    });

    it('recusa e-mail diferente de OWNER_EMAIL e token inválido, com auditoria', async () => {
      const b = new Browser(t.app);
      const e1 = await b.post('/api/auth/setup', setupBody({ email: 'outra@exemplo.com.br' }));
      const e2 = await b.post('/api/auth/setup', setupBody({ setupToken: 'errado' }));
      expect([e1.status, e2.status]).toEqual([403, 403]);
      expect(e1.body.code).toBe('SETUP_REJECTED');
      expect(await t.prisma.db.user.count()).toBe(0);
      expect(await t.prisma.db.auditLog.count({ where: { action: 'setup.rejected' } })).toBe(2);
    });

    it('recusa senha curta ou vazada com mensagem clara', async () => {
      const b = new Browser(t.app);
      const curta = await b.post('/api/auth/setup', setupBody({ password: 'curta' }));
      expect(curta.status).toBe(422);
      expect(curta.body.detail).toBe('A senha precisa ter pelo menos 12 caracteres.');
      const vazada = await b.post('/api/auth/setup', setupBody({ password: 'senha1234567' }));
      expect(vazada.status).toBe(422);
      expect(vazada.body).toMatchObject({ code: 'WEAK_PASSWORD', errors: [{ path: 'password' }] });
    });

    it('cria usuária, workspace e sessão; banco guarda só hashes', async () => {
      const b = new Browser(t.app);
      const res = await b.post('/api/auth/setup', setupBody({ workspaceName: 'Ateliê Annalu' }));
      expect(res.status).toBe(201);
      const me = meSchema.parse(res.body);
      expect(me.user.email).toBe(OWNER_EMAIL);
      expect(me.workspaces).toEqual([expect.objectContaining({ name: 'Ateliê Annalu', slug: 'atelie-annalu', role: 'OWNER' })]);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/);

      const sid = cookieFrom(res, '__Host-sid')!;
      expect(sid.attrs).toMatch(/HttpOnly/);
      expect(sid.attrs).toMatch(/Secure/);
      expect(sid.attrs).toMatch(/SameSite=Lax/);
      expect(sid.attrs).toMatch(/Path=\//);

      const user = await t.prisma.db.user.findUniqueOrThrow({ where: { email: OWNER_EMAIL } });
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      const session = await t.prisma.db.session.findFirstOrThrow({ where: { userId: user.id } });
      expect(session.tokenHash).toBe(sha256(sid.value));
      expect(session.tokenHash).not.toBe(sid.value);
      expect(await t.prisma.db.auditLog.count({ where: { action: 'setup.completed', userId: user.id } })).toBe(1);
    });

    it('depois de criada a senha, a rota responde 404 para sempre', async () => {
      await setupOwner();
      await request(t.app.getHttpServer()).get('/api/auth/setup').expect(404);
      const again = await new Browser(t.app).post('/api/auth/setup', setupBody());
      expect(again.status).toBe(404);
      expect(await t.prisma.db.user.count()).toBe(1);
    });

    it('duas tentativas simultâneas criam só uma usuária', async () => {
      const [x, y] = await Promise.all([new Browser(t.app).post('/api/auth/setup', setupBody()), new Browser(t.app).post('/api/auth/setup', setupBody())]);
      expect([x.status, y.status].sort((m, n) => m - n)).toEqual([201, 404]);
      expect(await t.prisma.db.workspace.count()).toBe(1);
    });

    it('sem OWNER_EMAIL/SETUP_TOKEN configurados, o primeiro acesso não existe', async () => {
      const semSetup = await createTestApp({ OWNER_EMAIL: '', SETUP_TOKEN: '' });
      try {
        await request(semSetup.app.getHttpServer()).get('/api/auth/setup').expect(404);
        const res = await new Browser(semSetup.app).post('/api/auth/setup', setupBody());
        expect(res.status).toBe(404);
      } finally {
        await semSetup.close();
      }
    });
  });

  describe('CSRF (E1-3)', () => {
    it('mutação sem token CSRF recebe 403', async () => {
      const res = await request(t.app.getHttpServer()).post('/api/auth/login').send({ email: OWNER_EMAIL, password: SENHA });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CSRF_REJECTED');
    });

    it('mutação vinda de outra origem recebe 403 mesmo com token', async () => {
      const csrf = await request(t.app.getHttpServer()).get('/api/auth/csrf');
      const cookie = cookieFrom(csrf, '__Host-csrf')!;
      const res = await request(t.app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', 'https://site-malicioso.example')
        .set('Cookie', `__Host-csrf=${cookie.value}`)
        .set('x-csrf-token', csrf.body.csrfToken)
        .send({ email: OWNER_EMAIL, password: SENHA });
      expect(res.status).toBe(403);
    });

    it('token no header diferente do cookie recebe 403', async () => {
      const csrf = await request(t.app.getHttpServer()).get('/api/auth/csrf');
      const cookie = cookieFrom(csrf, '__Host-csrf')!;
      const res = await request(t.app.getHttpServer())
        .post('/api/auth/login')
        .set('Cookie', `__Host-csrf=${cookie.value}`)
        .set('x-csrf-token', 'x'.repeat(43))
        .send({ email: OWNER_EMAIL, password: SENHA });
      expect(res.status).toBe(403);
    });
  });

  describe('Login, sessão e logout (E1-2)', () => {
    it('senha errada e e-mail desconhecido dão a mesma resposta genérica', async () => {
      await setupOwner();
      const b = new Browser(t.app);
      const errada = await b.post('/api/auth/login', { email: OWNER_EMAIL, password: 'senha errada mas longa' });
      const desconhecido = await b.post('/api/auth/login', { email: 'ninguem@exemplo.com.br', password: SENHA });
      expect([errada.status, desconhecido.status]).toEqual([401, 401]);
      expect(errada.body.detail).toBe('E-mail ou senha incorretos.');
      expect(desconhecido.body.detail).toBe(errada.body.detail);
      expect(desconhecido.body.code).toBe(errada.body.code);
    });

    it('login certo cria sessão nova e /me responde sem dados sensíveis', async () => {
      await setupOwner();
      const b = new Browser(t.app);
      const res = await b.post('/api/auth/login', { email: 'DONA@exemplo.com.br', password: SENHA });
      expect(res.status).toBe(200);
      const me = await b.get('/api/auth/me');
      expect(me.status).toBe(200);
      expect(meSchema.parse(me.body).user.email).toBe(OWNER_EMAIL);
      expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|tokenHash/);
      expect(await t.prisma.db.session.count()).toBe(2); // setup + login (token novo a cada login)
    });

    it('sem sessão, rotas protegidas respondem 401', async () => {
      await request(t.app.getHttpServer()).get('/api/auth/me').expect(401);
      const forjada = new Browser(t.app);
      forjada.setCookie('__Host-sid', 'token-inventado');
      expect((await forjada.get('/api/auth/me')).status).toBe(401);
    });

    it('logout revoga a sessão no banco e apaga o cookie', async () => {
      const b = await setupOwner();
      const token = b.cookie('__Host-sid')!;
      expect((await b.post('/api/auth/logout')).status).toBe(204);
      expect(b.cookie('__Host-sid')).toBeUndefined();
      const session = await t.prisma.db.session.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });
      expect(session.revokedAt).not.toBeNull();
      const reuso = new Browser(t.app);
      reuso.setCookie('__Host-sid', token);
      expect((await reuso.get('/api/auth/me')).status).toBe(401);
    });

    it('sessão parada há mais de 7 dias expira', async () => {
      const b = await setupOwner();
      await t.prisma.db.session.updateMany({ data: { lastSeenAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });
      expect((await b.get('/api/auth/me')).status).toBe(401);
    });
  });

  it('várias senhas erradas seguidas não bloqueiam a conta (E1-4 retirado, D-34)', async () => {
    await setupOwner();
    const b = new Browser(t.app);
    for (let i = 0; i < 12; i++) expect((await b.post('/api/auth/login', { email: OWNER_EMAIL, password: `errada numero ${i}!` })).status).toBe(401);
    expect((await b.post('/api/auth/login', { email: OWNER_EMAIL, password: SENHA })).status).toBe(200);
    expect(await t.prisma.db.auditLog.count({ where: { action: 'login.failed' } })).toBe(12);
  });

  it('a senha nunca aparece nos logs nem no AuditLog', async () => {
    await setupOwner();
    const b = new Browser(t.app);
    await b.post('/api/auth/login', { email: OWNER_EMAIL, password: 'tentativa errada secreta' });
    await b.post('/api/auth/login', { email: OWNER_EMAIL, password: SENHA });
    const logs = t.logger.lines.join('\n');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs).not.toContain(SENHA);
    expect(logs).not.toContain('tentativa errada secreta');
    const audit = JSON.stringify(await t.prisma.db.auditLog.findMany());
    expect(audit).not.toContain(SENHA);
    expect(audit).not.toContain('tentativa errada secreta');
  });
});

describe('Autorização cruzada entre workspaces (E2-4)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await resetIdentity(t.prisma);
  });
  afterAll(async () => {
    await resetIdentity(t.prisma);
    await t.close();
  });

  it('cada usuária enxerga só o próprio workspace; o de outra responde 404', async () => {
    const { a, b } = await createTwoWorkspaces(t);
    const proprio = await a.browser.get(`/api/workspaces/${a.workspaceId}`);
    expect(proprio.status).toBe(200);
    expect(proprio.body).toMatchObject({ id: a.workspaceId, role: 'OWNER' });

    const alheio = await a.browser.get(`/api/workspaces/${b.workspaceId}`);
    expect(alheio.status).toBe(404);
    expect(alheio.body.code).toBe('NOT_FOUND');
    expect((await b.browser.get(`/api/workspaces/${a.workspaceId}`)).status).toBe(404);
  });

  it('workspace inexistente também responde 404 (mesma resposta: não revela existência)', async () => {
    const { a, b } = await createTwoWorkspaces(t);
    const inexistente = await a.browser.get('/api/workspaces/cl000000000000000000000000');
    const alheio = await a.browser.get(`/api/workspaces/${b.workspaceId}`);
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.detail).toBe(alheio.body.detail);
  });

  it('sem sessão responde 401', async () => {
    const { a } = await createTwoWorkspaces(t);
    await request(t.app.getHttpServer()).get(`/api/workspaces/${a.workspaceId}`).expect(401);
  });
});
