import { parseEnv } from '../config/env.js';
import { GithubReposService } from './github-repos.service.js';

const PERSONAL = 'github_pat_PESSOAL_nao_e_real_1234567890';
const ORG = 'github_pat_FLORENCE_nao_e_real_1234567890';

function repo(id: number, name: string, extra: Record<string, unknown> = {}) {
  return { id, name, full_name: `dono/${name}`, description: null, html_url: `https://github.com/dono/${name}`, private: false, archived: false, pushed_at: null, ...extra };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('Repositórios do GitHub (D-39)', () => {
  it('sem tokens, não está configurado', () => {
    expect(new GithubReposService(parseEnv({ NODE_ENV: 'test' })).configured).toBe(false);
  });

  it('lista só os repositórios da dona e os de cada organização com o token dela', async () => {
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json([repo(1, 'meu'), repo(2, 'velho', { archived: true })]));
      if (url.includes('/orgs/florence/repos')) return Promise.resolve(json([repo(3, 'trabalho')]));
      return Promise.resolve(json({}, 404));
    });
    const env = parseEnv({ NODE_ENV: 'test', GITHUB_TOKEN: PERSONAL, GITHUB_ORG_TOKENS: `florence=${ORG}` });
    const svc = new GithubReposService(env, fetchFn as unknown as typeof fetch);
    const { repos, failedOrgs } = await svc.list(0);
    expect(repos.map((r) => [r.id, r.org, r.archived])).toEqual([['1', null, false], ['2', null, true], ['3', 'florence', false]]);
    expect(failedOrgs).toEqual([]);

    const calls = fetchFn.mock.calls as [string, RequestInit][];
    expect(calls[0]![0]).toContain('affiliation=owner');
    expect((calls[0]![1].headers as Record<string, string>).authorization).toBe(`bearer ${PERSONAL}`);
    expect((calls[1]![1].headers as Record<string, string>).authorization).toBe(`bearer ${ORG}`);
    expect(calls.every(([, init]) => !init.method || init.method === 'GET')).toBe(true);

    await svc.list(60_000); // dentro do cache de 5 min
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('pagina até acabar e falha de uma organização não derruba a lista', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => repo(i + 1, `r${i + 1}`));
    const fetchFn = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/user/repos')) return Promise.resolve(json(url.endsWith('&page=1') ? page1 : [repo(101, 'r101')]));
      return Promise.resolve(json({}, 401));
    });
    const env = parseEnv({ NODE_ENV: 'test', GITHUB_TOKEN: PERSONAL, GITHUB_ORG_TOKENS: `florence=${ORG}` });
    const { repos, failedOrgs } = await new GithubReposService(env, fetchFn as unknown as typeof fetch).list(0);
    expect(repos).toHaveLength(101);
    expect(failedOrgs).toEqual(['florence']);
  });

  it('token pessoal recusado vira erro claro, sem expor o token', async () => {
    const env = parseEnv({ NODE_ENV: 'test', GITHUB_TOKEN: PERSONAL });
    const err = await new GithubReposService(env, (() => Promise.resolve(json({}, 401))) as unknown as typeof fetch).list(0).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/recusado/);
    expect(JSON.stringify(err) + (err as Error).message).not.toContain(PERSONAL);
  });

  it('GITHUB_ORG_TOKENS em formato errado impede a API de subir (sem mostrar o token)', () => {
    expect(() => parseEnv({ NODE_ENV: 'test', GITHUB_ORG_TOKENS: ORG })).toThrow(/org=token/);
    try {
      parseEnv({ NODE_ENV: 'test', GITHUB_ORG_TOKENS: ORG });
    } catch (e) {
      expect((e as Error).message).not.toContain(ORG);
    }
  });
});
