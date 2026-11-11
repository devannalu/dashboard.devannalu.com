import { parseEnv } from '../config/env.js';
import { GithubContributionsService } from './github-contributions.service.js';

const TOKEN = 'github_pat_TESTE_nao_e_real_1234567890';
const env = parseEnv({ NODE_ENV: 'test', GITHUB_TOKEN: TOKEN });

function calendarResponse() {
  return new Response(
    JSON.stringify({
      data: {
        viewer: {
          login: 'annalu',
          url: 'https://github.com/annalu',
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: 7,
              weeks: [
                { contributionDays: [{ date: '2026-11-08', contributionCount: 0 }, { date: '2026-11-09', contributionCount: 3 }] },
                { contributionDays: [{ date: '2026-11-10', contributionCount: 4 }, { date: '2026-11-11', contributionCount: 0 }] },
              ],
            },
          },
        },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('Contribuições do GitHub (D-37)', () => {
  it('sem token, informa que não está configurado e não chama o GitHub', async () => {
    const fetchFn = vi.fn();
    const svc = new GithubContributionsService(parseEnv({ NODE_ENV: 'test' }), fetchFn as unknown as typeof fetch);
    expect(await svc.contributions(12)).toEqual({ configured: false });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('lê o calendário do dono do token, só leitura, e guarda em cache por 30 min', async () => {
    const fetchFn = vi.fn().mockImplementation(() => Promise.resolve(calendarResponse()));
    const svc = new GithubContributionsService(env, fetchFn as unknown as typeof fetch);
    const now = new Date('2026-11-11T12:00:00Z');
    const r = await svc.contributions(12, now);
    expect(r).toEqual({
      configured: true,
      login: 'annalu',
      profileUrl: 'https://github.com/annalu',
      total: 7,
      from: '2026-11-08',
      to: '2026-11-11',
      days: [
        { date: '2026-11-09', count: 3 },
        { date: '2026-11-10', count: 4 },
      ],
    });
    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/graphql');
    expect(init.method).toBe('POST');
    const sent = init.body as string;
    expect(sent).toContain('contributionCalendar');
    expect(sent).not.toMatch(/mutation/);

    // Duas consultas por atualização (visão do token + perfil público); depois, cache de 30 min.
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await svc.contributions(12, new Date(now.getTime() + 10 * 60_000));
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await svc.contributions(12, new Date(now.getTime() + 31 * 60_000));
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('junta a visão do token com a do perfil público (privadas anônimas), maior número por dia', async () => {
    const profile = new Response(
      JSON.stringify({
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                totalContributions: 12,
                weeks: [{ contributionDays: [{ date: '2026-11-08', contributionCount: 5 }, { date: '2026-11-09', contributionCount: 1 }] }, { contributionDays: [{ date: '2026-11-10', contributionCount: 4 }, { date: '2026-11-11', contributionCount: 2 }] }],
              },
            },
          },
        },
      }),
      { status: 200 },
    );
    const fetchFn = vi.fn().mockImplementationOnce(() => Promise.resolve(calendarResponse())).mockImplementationOnce(() => Promise.resolve(profile));
    const r = await new GithubContributionsService(env, fetchFn as unknown as typeof fetch).contributions(12, new Date('2026-11-11T12:00:00Z'));
    const sent = JSON.parse((fetchFn.mock.calls[1] as [string, RequestInit])[1].body as string) as { query: string; variables: { login: string } };
    expect(sent.query).toContain('user(login: $login)');
    expect(sent.variables.login).toBe('annalu');
    expect(r.days).toEqual([
      { date: '2026-11-08', count: 5 },
      { date: '2026-11-09', count: 3 },
      { date: '2026-11-10', count: 4 },
      { date: '2026-11-11', count: 2 },
    ]);
    expect(r.total).toBe(14);
  });

  it('se o perfil público falhar, mostra só a visão do token', async () => {
    const fetchFn = vi.fn().mockImplementationOnce(() => Promise.resolve(calendarResponse())).mockImplementationOnce(() => Promise.reject(new Error('ECONNRESET')));
    const r = await new GithubContributionsService(env, fetchFn as unknown as typeof fetch).contributions(12, new Date('2026-11-11T12:00:00Z'));
    expect(r.total).toBe(7);
  });

  it('token recusado vira erro claro, sem expor o token', async () => {
    const svc = new GithubContributionsService(env, (() => Promise.resolve(new Response('{}', { status: 401 }))) as unknown as typeof fetch);
    const err = await svc.contributions(12).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/token do GitHub foi recusado/);
    expect(JSON.stringify(err)).not.toContain(TOKEN);
    expect((err as Error).message).not.toContain(TOKEN);
  });

  it('GitHub fora do ar vira 502 amigável', async () => {
    const svc = new GithubContributionsService(env, (() => Promise.reject(new Error('ECONNRESET'))) as unknown as typeof fetch);
    await expect(svc.contributions(6)).rejects.toThrow('Não foi possível falar com o GitHub');
  });
});
