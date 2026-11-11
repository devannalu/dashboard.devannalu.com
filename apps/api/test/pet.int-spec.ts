import { currentSatiety, humorOf, moodOf, nextStreak } from '../src/modules/pet.controller.js';
import { createTestApp, createTwoWorkspaces, resetIdentity, type Tenant, type TestApp } from './helpers/app.js';

describe('Pet do Início (D-42, MySQL real)', () => {
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

  it('nasce na primeira visita com lancheira vazia (nada inventado do passado)', async () => {
    await a.browser.post(ws(a, '/ideas'), { title: 'Ideia de antes do pet' });
    const pet = (await a.browser.get(ws(a, '/pet'))).body;
    expect(pet).toMatchObject({ name: 'Cereja', level: 1, xp: 0, streak: 0, fedToday: false });
    expect(pet.inventory).toEqual({ cereja: 0, cupcake: 0, torta: 0, bolo: 0, milkshake: 0 });
  });

  it('concluir tarefa rende uma cereja só uma vez, mesmo marcando e desmarcando', async () => {
    await a.browser.get(ws(a, '/pet'));
    const task = (await a.browser.post(ws(a, '/tasks'), { title: 'Fazer o RD' })).body;
    await a.browser.patch(ws(a, `/tasks/${task.id}`), { status: 'DONE' });
    let pet = (await a.browser.get(ws(a, '/pet'))).body;
    expect(pet.inventory.cereja).toBe(1);
    expect(pet.newAwards).toEqual(['cereja']);
    await a.browser.patch(ws(a, `/tasks/${task.id}`), { status: 'TODO' });
    await a.browser.patch(ws(a, `/tasks/${task.id}`), { status: 'DONE' });
    pet = (await a.browser.get(ws(a, '/pet'))).body;
    expect(pet.inventory.cereja).toBe(1);
    expect(pet.newAwards).toEqual([]);
  });

  it('ideia nova rende cupcake; alimentar gasta a comida, sobe saciedade, XP e sequência', async () => {
    const before = (await a.browser.get(ws(a, '/pet'))).body;
    await a.browser.post(ws(a, '/ideas'), { title: 'App de receitas' });
    const fed = await a.browser.post(ws(a, '/pet/alimentar'), { food: 'cupcake' });
    expect(fed.status).toBe(201);
    expect(fed.body.inventory.cupcake).toBe(0);
    expect(fed.body.xp).toBe(2);
    expect(fed.body.satiety).toBeGreaterThan(before.satiety);
    expect(fed.body).toMatchObject({ fedToday: true, streak: 1 });
    const empty = await a.browser.post(ws(a, '/pet/alimentar'), { food: 'cupcake' });
    expect(empty.status).toBe(409);
  });

  it('carinho conta no dia e o nome pode mudar', async () => {
    const p1 = (await a.browser.post(ws(a, '/pet/carinho'))).body;
    expect(p1.pettedToday).toBe(1);
    const renamed = await a.browser.patch(ws(a, '/pet'), { name: 'Lulu' });
    expect(renamed.body.name).toBe('Lulu');
    expect((await a.browser.patch(ws(a, '/pet'), { name: '' })).status).toBe(422);
  });

  it('cada workspace tem o seu pet; A não mexe no de B', async () => {
    expect((await a.browser.get(ws(b, '/pet'))).status).toBe(404);
    expect((await a.browser.post(ws(b, '/pet/carinho'))).status).toBe(404);
    expect((await a.browser.post(ws(b, '/pet/alimentar'), { food: 'cereja' })).status).toBe(404);
    // tarefa concluída em B não vira comida para A
    await a.browser.get(ws(a, '/pet'));
    const tb = (await b.browser.post(ws(b, '/tasks'), { title: 'De B' })).body;
    await b.browser.patch(ws(b, `/tasks/${tb.id}`), { status: 'DONE' });
    expect((await a.browser.get(ws(a, '/pet'))).body.inventory.cereja).toBe(0);
  });
});

describe('Regras do pet (funções puras)', () => {
  it('saciedade cai ~4 por hora e nunca fica negativa', () => {
    const at = new Date('2026-11-11T10:00:00Z');
    expect(currentSatiety(60, at, new Date('2026-11-11T12:00:00Z'))).toBe(52);
    expect(currentSatiety(20, at, new Date('2026-11-12T12:00:00Z'))).toBe(0);
  });
  it('humor segue a fórmula e fica entre 0 e 100', () => {
    expect(humorOf({ overdue: 0, doneToday: 0, petted: 0, satiety: 50 })).toBe(60);
    expect(humorOf({ overdue: 0, doneToday: 3, petted: 9, satiety: 70 })).toBe(100);
    expect(humorOf({ overdue: 5, doneToday: 0, petted: 0, satiety: 10 })).toBe(0);
  });
  it('expressão respeita a prioridade (fraquinha > sonolenta > faminta > preocupada > feliz)', () => {
    expect(moodOf({ satiety: 0, humor: 90, overdue: 0, hour: 12 })).toBe('fraquinha');
    expect(moodOf({ satiety: 50, humor: 90, overdue: 0, hour: 23 })).toBe('sonolenta');
    expect(moodOf({ satiety: 20, humor: 90, overdue: 0, hour: 12 })).toBe('faminta');
    expect(moodOf({ satiety: 50, humor: 40, overdue: 2, hour: 12 })).toBe('preocupada');
    expect(moodOf({ satiety: 70, humor: 85, overdue: 0, hour: 12 })).toBe('feliz');
    expect(moodOf({ satiety: 50, humor: 60, overdue: 0, hour: 12 })).toBe('tranquila');
  });
  it('sequência: mesmo dia mantém, dia seguinte soma, intervalo recomeça', () => {
    expect(nextStreak('2026-11-11', '2026-11-11', 4)).toBe(4);
    expect(nextStreak('2026-11-10', '2026-11-11', 4)).toBe(5);
    expect(nextStreak('2026-11-08', '2026-11-11', 4)).toBe(1);
    expect(nextStreak(null, '2026-11-11', 0)).toBe(1);
  });
});
