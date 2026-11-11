import { todayIn } from '../src/modules/insights.controller.js';
import { createTestApp, createTwoWorkspaces, resetIdentity, type Tenant, type TestApp } from './helpers/app.js';

/** Fluxos do dia a dia relatados pela owner: o que é criado precisa aparecer no Início e no calendário. */
describe('Início e calendário refletem o que é criado (MySQL real)', () => {
  let t: TestApp;
  let a: Tenant;
  const ws = (path: string) => `/api/workspaces/${a.workspaceId}${path}`;
  const plus = (ymd: string, days: number) => new Date(Date.parse(`${ymd}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

  beforeAll(async () => {
    t = await createTestApp();
    await resetIdentity(t.prisma);
  });
  beforeEach(async () => {
    ({ a } = await createTwoWorkspaces(t));
  });
  afterAll(async () => {
    await resetIdentity(t.prisma);
    await t.close();
  });

  it('tarefa com prazo daqui a 2 dias aparece nos próximos dias do Início e no calendário', async () => {
    const today = todayIn('America/Sao_Paulo');
    const due = plus(today, 2);
    const task = await a.browser.post(ws('/tasks'), { title: 'Iniciar o RD', priority: 'HIGH', dueDate: due });
    expect(task.status).toBe(201);
    const d = (await a.browser.get(ws('/dashboard'))).body;
    expect(d.upcoming).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'task', title: 'Iniciar o RD', date: due })]));
    const cal = (await a.browser.get(ws(`/calendar?from=${today}&to=${plus(today, 30)}`))).body.data;
    expect(cal).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'task', title: 'Iniciar o RD' })]));
  });

  it('projeto em planejamento (ex.: vindo de uma ideia) aparece em Projetos ativos', async () => {
    const idea = (await a.browser.post(ws('/ideas'), { title: 'App de receitas' })).body;
    const conv = await a.browser.post(ws(`/ideas/${idea.id}/convert`), { category: 'PERSONAL' });
    expect(conv.status).toBe(201);
    const d = (await a.browser.get(ws('/dashboard'))).body;
    expect(d.counts.activeProjects).toBe(1);
    expect(d.activeProjects.map((p: { name: string }) => p.name)).toEqual(['App de receitas']);
  });

  it('nota e ideia criadas aparecem no Início e nas listas', async () => {
    await a.browser.post(ws('/notes'), { title: 'Lembrete', content: 'comprar café' });
    await a.browser.post(ws('/ideas'), { title: 'Ideia nova' });
    const d = (await a.browser.get(ws('/dashboard'))).body;
    expect(d.recentNotes.map((n: { title: string }) => n.title)).toContain('Lembrete');
    expect(d.counts.inboxNotes).toBe(1);
    expect(d.counts.ideas).toBe(1);
    expect((await a.browser.get(ws('/notes'))).body.data.map((n: { title: string }) => n.title)).toContain('Lembrete');
    expect((await a.browser.get(ws('/ideas'))).body.data.map((n: { title: string }) => n.title)).toContain('Ideia nova');
  });
});
