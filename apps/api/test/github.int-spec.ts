import { GithubReposService, type RepoInfo } from '../src/github/github-repos.service.js';
import { createTestApp, createTwoWorkspaces, resetIdentity, type Tenant, type TestApp } from './helpers/app.js';

/** GitHub falso: a importação nunca sai para a internet nos testes. */
const REPOS: RepoInfo[] = [
  { id: '101', name: 'studio-os', fullName: 'annalu/studio-os', description: 'Meu painel', url: 'https://github.com/annalu/studio-os', private: true, archived: false, org: null, pushedAt: '2026-11-10T10:00:00Z' },
  { id: '102', name: 'portfolio-2023', fullName: 'annalu/portfolio-2023', description: null, url: 'https://github.com/annalu/portfolio-2023', private: false, archived: true, org: null, pushedAt: '2023-05-01T10:00:00Z' },
  { id: '201', name: 'api-pagamentos', fullName: 'florence/api-pagamentos', description: 'Pagamentos', url: 'https://github.com/florence/api-pagamentos', private: true, archived: false, org: 'florence', pushedAt: '2026-11-09T10:00:00Z' },
];
const fake = { configured: true, list: () => Promise.resolve({ repos: REPOS, failedOrgs: [] }) };

describe('Importação de repositórios do GitHub (D-39, MySQL real)', () => {
  let t: TestApp;
  let a: Tenant;
  let b: Tenant;
  const ws = (x: Tenant, path: string) => `/api/workspaces/${x.workspaceId}${path}`;

  beforeAll(async () => {
    t = await createTestApp({}, (m) => m.overrideProvider(GithubReposService).useValue(fake));
    await resetIdentity(t.prisma);
  });
  beforeEach(async () => {
    ({ a, b } = await createTwoWorkspaces(t));
  });
  afterAll(async () => {
    await resetIdentity(t.prisma);
    await t.close();
  });

  it('lista os repositórios e marca os já importados só no próprio workspace', async () => {
    const list = await a.browser.get(ws(a, '/github/repos'));
    expect(list.status).toBe(200);
    expect(list.body.configured).toBe(true);
    expect(list.body.data.map((r: { id: string; projectId: string | null }) => [r.id, r.projectId])).toEqual([['101', null], ['102', null], ['201', null]]);

    await a.browser.post(ws(a, '/github/import'), { items: [{ repoId: '101', category: 'OWNED_PRODUCT' }] });
    const afterA = (await a.browser.get(ws(a, '/github/repos'))).body.data;
    expect(afterA.find((r: { id: string }) => r.id === '101').projectId).toEqual(expect.any(String));
    const forB = (await b.browser.get(ws(b, '/github/repos'))).body.data;
    expect(forB.find((r: { id: string }) => r.id === '101').projectId).toBeNull();
  });

  it('organização vira Trabalho profissional; arquivado entra como Arquivado; sem duplicar', async () => {
    const res = await a.browser.post(ws(a, '/github/import'), {
      items: [
        { repoId: '101', category: 'PERSONAL' },
        { repoId: '102', category: 'PERSONAL' },
        { repoId: '201', category: 'PERSONAL' }, // tentativa de mudar a categoria da organização
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ created: 3, skipped: 0 });

    const projects = (await a.browser.get(ws(a, '/projects'))).body.data as Record<string, unknown>[];
    const byRepo = Object.fromEntries(projects.map((p) => [p.githubRepoId, p]));
    expect(byRepo['101']).toMatchObject({ name: 'studio-os', category: 'PERSONAL', status: 'PLANNING', githubOrg: null, githubArchived: false, githubUrl: 'https://github.com/annalu/studio-os' });
    expect(byRepo['102']).toMatchObject({ status: 'ARCHIVED', githubArchived: true });
    expect(byRepo['201']).toMatchObject({ category: 'PROFESSIONAL_WORK', githubOrg: 'florence' });

    const again = await a.browser.post(ws(a, '/github/import'), { items: [{ repoId: '101', category: 'PERSONAL' }] });
    expect(again.body).toEqual({ created: 0, skipped: 1 });
    expect((await a.browser.get(ws(a, '/projects'))).body.data).toHaveLength(3);
  });

  it('cliente de outro workspace e repositório inexistente são recusados', async () => {
    const clientB = (await b.browser.post(ws(b, '/clients'), { name: 'Cliente de B' })).body.id as string;
    const cross = await a.browser.post(ws(a, '/github/import'), { items: [{ repoId: '101', category: 'CLIENT', clientId: clientB }] });
    expect(cross.status).toBe(422);
    const missing = await a.browser.post(ws(a, '/github/import'), { items: [{ repoId: '999', category: 'PERSONAL' }] });
    expect(missing.status).toBe(422);
    expect((await a.browser.get(ws(a, '/projects'))).body.data).toHaveLength(0);
  });

  it('A não lista nem importa pelo workspace de B', async () => {
    expect((await a.browser.get(ws(b, '/github/repos'))).status).toBe(404);
    expect((await a.browser.post(ws(b, '/github/import'), { items: [{ repoId: '101', category: 'PERSONAL' }] })).status).toBe(404);
  });
});
