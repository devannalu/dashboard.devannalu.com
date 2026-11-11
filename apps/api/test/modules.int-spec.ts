import { todayIn } from '../src/modules/insights.controller.js';
import { createTestApp, createTwoWorkspaces, resetIdentity, type Tenant, type TestApp } from './helpers/app.js';

describe('Módulos do MVP (MySQL real)', () => {
  let t: TestApp;
  let a: Tenant;
  let b: Tenant;
  const ws = (x: Tenant, path: string) => `/api/workspaces/${x.workspaceId}${path}`;

  beforeAll(async () => {
    t = await createTestApp();
    await resetIdentity(t.prisma);
  });
  beforeEach(async () => {
    ({ a, b } = await createTwoWorkspaces(t));
  });
  afterAll(async () => {
    await resetIdentity(t.prisma);
    await t.close();
  });

  describe('Autorização cruzada em todos os recursos (E2-4)', () => {
    const cases: [string, (p: string) => object][] = [
      ['clients', () => ({ name: 'Cliente X' })],
      ['projects', () => ({ name: 'Projeto X' })],
      ['milestones', (projectId) => ({ projectId, title: 'Marco X' })],
      ['tasks', () => ({ title: 'Tarefa X' })],
      ['events', () => ({ title: 'Evento X', startsAt: '2026-11-20T14:00:00.000-03:00' })],
      ['notes', () => ({ title: 'Nota X', content: 'segredo da B' })],
      ['ideas', () => ({ title: 'Ideia X' })],
    ];

    it.each(cases)('%s: A não lê, altera, apaga nem lista o que é de B', async (resource, body) => {
      const projB = (await b.browser.post(ws(b, '/projects'), { name: 'Projeto de B' })).body.id as string;
      const created = await b.browser.post(ws(b, `/${resource}`), body(projB));
      expect(created.status).toBe(201);
      const id = created.body.id as string;

      // pelo workspace de B na URL → 404 (A não é membro)
      expect((await a.browser.get(ws(b, `/${resource}/${id}`))).status).toBe(404);
      expect((await a.browser.get(ws(b, `/${resource}`))).status).toBe(404);
      // pelo workspace de A na URL, com o id de B → 404
      expect((await a.browser.get(ws(a, `/${resource}/${id}`))).status).toBe(404);
      expect((await a.browser.patch(ws(a, `/${resource}/${id}`), { title: 'invadido', name: 'invadido' })).status).toBe(404);
      expect((await a.browser.delete(ws(a, `/${resource}/${id}`))).status).toBe(404);
      const listA = await a.browser.get(ws(a, `/${resource}`));
      expect(listA.body.data.map((r: { id: string }) => r.id)).not.toContain(id);
      // B continua vendo o item intacto
      expect((await b.browser.get(ws(b, `/${resource}/${id}`))).status).toBe(200);
    });

    it('não permite vincular tarefa a projeto de outro workspace', async () => {
      const projB = (await b.browser.post(ws(b, '/projects'), { name: 'Projeto de B' })).body.id as string;
      const res = await a.browser.post(ws(a, '/tasks'), { title: 'Tarefa', projectId: projB });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('INVALID_REFERENCE');
    });

    it('dashboard, calendário, relatórios, busca e arquivos de B respondem 404 para A', async () => {
      for (const p of ['/activity', '/dashboard', '/calendar?from=2026-11-01&to=2026-12-01', '/reports', '/search?q=xx', '/files']) {
        expect((await a.browser.get(ws(b, p))).status).toBe(404);
      }
    });

    it('a busca de A não encontra conteúdo de B', async () => {
      await b.browser.post(ws(b, '/notes'), { title: 'Receita secreta', content: 'cereja' });
      const res = await a.browser.get(ws(a, '/search?q=secreta'));
      expect(res.body.data).toEqual([]);
    });
  });

  it('tarefa: concluir grava completedAt e reabrir limpa; progresso do projeto acompanha', async () => {
    const proj = (await a.browser.post(ws(a, '/projects'), { name: 'Site', status: 'IN_PROGRESS' })).body;
    expect(proj.progress).toEqual({ done: 0, total: 0, percent: null });
    const t1 = (await a.browser.post(ws(a, '/tasks'), { title: 'Layout', projectId: proj.id })).body;
    await a.browser.post(ws(a, '/tasks'), { title: 'Deploy', projectId: proj.id });

    const done = await a.browser.patch(ws(a, `/tasks/${t1.id}`), { status: 'DONE' });
    expect(done.status).toBe(200);
    expect(done.body.completedAt).not.toBeNull();
    expect((await a.browser.get(ws(a, `/projects/${proj.id}`))).body.progress).toEqual({ done: 1, total: 2, percent: 50 });

    const reopened = await a.browser.patch(ws(a, `/tasks/${t1.id}`), { status: 'TODO' });
    expect(reopened.body.completedAt).toBeNull();
  });

  it('validação: título vazio e data inválida → 422 com campo', async () => {
    const res = await a.browser.post(ws(a, '/tasks'), { title: '  ', dueDate: '13/11/2026' });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e: { path: string }) => e.path).sort()).toEqual(['dueDate', 'title']);
  });

  it('nota: versão desatualizada → 409; arquivar some da lista padrão', async () => {
    const note = (await a.browser.post(ws(a, '/notes'), { title: 'Rascunho', content: 'v1' })).body;
    expect(note.version).toBe(1);
    const ok = await a.browser.patch(ws(a, `/notes/${note.id}`), { content: 'v2', version: 1 });
    expect(ok.body.version).toBe(2);
    const stale = await a.browser.patch(ws(a, `/notes/${note.id}`), { content: 'v2 de outra aba', version: 1 });
    expect(stale.status).toBe(409);
    await a.browser.patch(ws(a, `/notes/${note.id}`), { archived: true });
    expect((await a.browser.get(ws(a, '/notes'))).body.data).toHaveLength(0);
    expect((await a.browser.get(ws(a, '/notes?archived=true'))).body.data).toHaveLength(1);
  });

  it('ideia → projeto: transação leva as notas; segunda conversão → 409; ideia fica somente leitura', async () => {
    const idea = (await a.browser.post(ws(a, '/ideas'), { title: 'App de receitas', description: 'Receitas com cereja' })).body;
    const note = (await a.browser.post(ws(a, '/notes'), { title: 'Pesquisa', content: '...', ideaId: idea.id })).body;
    const conv = await a.browser.post(ws(a, `/ideas/${idea.id}/convert`), {});
    expect(conv.status).toBe(201);
    const project = (await a.browser.get(ws(a, `/projects/${conv.body.projectId}`))).body;
    expect(project).toMatchObject({ name: 'App de receitas', description: 'Receitas com cereja', status: 'PLANNING' });
    expect((await a.browser.get(ws(a, `/notes/${note.id}`))).body.projectId).toBe(project.id);
    expect((await a.browser.post(ws(a, `/ideas/${idea.id}/convert`), {})).status).toBe(409);
    expect((await a.browser.patch(ws(a, `/ideas/${idea.id}`), { title: 'mudar' })).status).toBe(409);
  });

  it('dashboard e calendário refletem só dados reais', async () => {
    const vazio = (await a.browser.get(ws(a, '/dashboard'))).body;
    expect(vazio.counts).toEqual({ activeProjects: 0, openTasks: 0, overdueTasks: 0, dueToday: 0, ideas: 0, inboxNotes: 0 });
    expect(vazio.activeProjects).toEqual([]);

    const today = todayIn('America/Sao_Paulo');
    await a.browser.post(ws(a, '/tasks'), { title: 'Hoje', dueDate: today });
    await a.browser.post(ws(a, '/tasks'), { title: 'Atrasada', dueDate: '2020-01-01' });
    await a.browser.post(ws(a, '/notes'), { title: 'Inbox', content: 'x' });
    await a.browser.post(ws(a, '/projects'), { name: 'Ativo', status: 'IN_PROGRESS' });
    const d = (await a.browser.get(ws(a, '/dashboard'))).body;
    expect(d.counts).toMatchObject({ activeProjects: 1, openTasks: 2, overdueTasks: 1, dueToday: 1, inboxNotes: 1 });
    expect(d.todayTasks.map((x: { title: string }) => x.title)).toEqual(['Hoje']);
    expect(d.overdueTasks.map((x: { title: string }) => x.title)).toEqual(['Atrasada']);

    const cal = await a.browser.get(ws(a, '/calendar?from=2019-12-15&to=2020-01-15'));
    expect(cal.body.data).toEqual([expect.objectContaining({ kind: 'task', title: 'Atrasada', date: '2020-01-01' })]);
    expect((await a.browser.get(ws(a, '/calendar?from=2020-01-01&to=2021-01-01'))).status).toBe(422);
  });

  it('calendário mostra início e prazo dos projetos (arquivados ficam de fora; B não aparece para A)', async () => {
    await a.browser.post(ws(a, '/projects'), { name: 'Loja', startDate: '2030-03-02', dueDate: '2030-03-20' });
    await a.browser.post(ws(a, '/projects'), { name: 'Velho', status: 'ARCHIVED', dueDate: '2030-03-10' });
    await b.browser.post(ws(b, '/projects'), { name: 'De B', dueDate: '2030-03-05' });
    const cal = (await a.browser.get(ws(a, '/calendar?from=2030-03-01&to=2030-04-01'))).body.data;
    expect(cal).toEqual([
      expect.objectContaining({ kind: 'project', edge: 'start', title: 'Loja', date: '2030-03-02' }),
      expect.objectContaining({ kind: 'project', edge: 'due', title: 'Loja', date: '2030-03-20' }),
    ]);
    // Só o prazo dentro do intervalo.
    const late = (await a.browser.get(ws(a, '/calendar?from=2030-03-15&to=2030-03-31'))).body.data;
    expect(late).toEqual([expect.objectContaining({ edge: 'due', title: 'Loja' })]);
  });

  it('relatórios: entregas no prazo e marcos atrasados', async () => {
    const proj = (await a.browser.post(ws(a, '/projects'), { name: 'P' })).body;
    const m1 = (await a.browser.post(ws(a, '/milestones'), { projectId: proj.id, title: 'Entrega', isDelivery: true, dueDate: '2099-01-01' })).body;
    await a.browser.patch(ws(a, `/milestones/${m1.id}`), { completed: true });
    await a.browser.post(ws(a, '/milestones'), { projectId: proj.id, title: 'Antigo', dueDate: '2020-01-01' });
    const r = (await a.browser.get(ws(a, '/reports'))).body;
    expect(r.milestones).toEqual({ total: 2, completed: 1, overdue: 1 });
    expect(r.onTimeDelivery).toEqual({ onTime: 1, total: 1, percent: 100 });
    expect(r.completedPerWeek).toHaveLength(8);
  });

  it('arquivos sem armazenamento configurado → 503 claro', async () => {
    const res = await a.browser.mutate('post', ws(a, '/files'), undefined, { field: 'file', data: Buffer.from('%PDF-1.4 teste'), name: 'contrato.pdf' });
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('STORAGE_NOT_CONFIGURED');
  });
  it('atividade: conta por dia no fuso da usuária e só do próprio workspace', async () => {
    const today = todayIn('America/Sao_Paulo');
    const t = (await a.browser.post(ws(a, '/tasks'), { title: 'Feita' })).body;
    await a.browser.patch(ws(a, `/tasks/${t.id}`), { status: 'DONE' });
    await a.browser.post(ws(a, '/notes'), { title: 'n', content: '' });
    await b.browser.post(ws(b, '/notes'), { title: 'de B', content: '' });
    const res = await a.browser.get(ws(a, '/activity?days=30'));
    expect(res.status).toBe(200);
    expect(res.body.to).toBe(today);
    expect(res.body.days).toEqual([{ date: today, tasksCreated: 1, tasksCompleted: 1, notesCreated: 1 }]);
  });

  it('disposição do Início: salva na conta, aparece no /me e recusa formato inválido', async () => {
    const layout = { widgets: [{ id: 'atividade', size: 'full', hidden: false, config: { kinds: ['tasksCompleted'], months: 6 } }, { id: 'hoje', size: 'md', hidden: true }] };
    expect((await a.browser.mutate('put', '/api/auth/me/dashboard', layout)).status).toBe(204);
    expect((await a.browser.get('/api/auth/me')).body.user.dashboardLayout).toEqual(layout);
    const ruim = await a.browser.mutate('put', '/api/auth/me/dashboard', { widgets: [{ id: 'hoje', size: 'gigante', hidden: false }] });
    expect(ruim.status).toBe(422);
    const repetido = await a.browser.mutate('put', '/api/auth/me/dashboard', { widgets: [{ id: 'hoje', size: 'md', hidden: false }, { id: 'hoje', size: 'sm', hidden: false }] });
    expect(repetido.status).toBe(422);
    expect((await b.browser.get('/api/auth/me')).body.user.dashboardLayout).toBeNull();
  });
});
