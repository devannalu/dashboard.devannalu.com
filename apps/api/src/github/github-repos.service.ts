import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GithubRepoDto } from '@studio/contracts';
import { AppException } from '../common/problem.filter.js';
import { ENV, type Env } from '../config/env.js';

const API = 'https://api.github.com';
const MAX_PAGES = 5; // até 500 repositórios por dono
const CACHE_MS = 5 * 60 * 1000;

interface RawRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  archived: boolean;
  pushed_at: string | null;
}

export type RepoInfo = Omit<GithubRepoDto, 'projectId'>;

/**
 * Repositórios do GitHub para importar como projetos (D-39). Somente leitura.
 * - Token pessoal (`GITHUB_TOKEN`): só os repositórios dos quais a dona é proprietária.
 * - Tokens por organização (`GITHUB_ORG_TOKENS`): repositórios da organização (viram "Trabalho profissional").
 * Tokens nunca aparecem em respostas, erros ou logs.
 */
@Injectable()
export class GithubReposService {
  private readonly log = new Logger('GitHub');
  private cache: { at: number; value: { repos: RepoInfo[]; failedOrgs: string[] } } | null = null;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  get configured(): boolean {
    return !!this.env.GITHUB_TOKEN || (this.env.GITHUB_ORG_TOKENS?.length ?? 0) > 0;
  }

  /** Lista combinada (pessoal + organizações). Falha do token pessoal é erro; de uma organização, só aviso. */
  async list(now = Date.now(), fresh = false): Promise<{ repos: RepoInfo[]; failedOrgs: string[] }> {
    if (!fresh && this.cache && now - this.cache.at < CACHE_MS) return this.cache.value;
    const repos: RepoInfo[] = [];
    const failedOrgs: string[] = [];
    if (this.env.GITHUB_TOKEN) {
      const mine = await this.fetchAll(`${API}/user/repos?affiliation=owner&sort=pushed`, this.env.GITHUB_TOKEN);
      repos.push(...mine.map((r) => toInfo(r, null)));
    }
    for (const { org, token } of this.env.GITHUB_ORG_TOKENS ?? []) {
      try {
        const list = await this.fetchAll(`${API}/orgs/${encodeURIComponent(org)}/repos?type=all&sort=pushed`, token);
        repos.push(...list.map((r) => toInfo(r, org)));
      } catch (e) {
        this.log.warn(`Não foi possível listar os repositórios da organização ${org}: ${(e as Error).message}`);
        failedOrgs.push(org);
      }
    }
    const unique = [...new Map(repos.map((r) => [r.id, r])).values()];
    const value = { repos: unique, failedOrgs };
    this.cache = { at: now, value };
    return value;
  }

  private async fetchAll(url: string, token: string): Promise<RawRepo[]> {
    const all: RawRepo[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      let res: Response;
      try {
        res = await this.fetchFn(`${url}&per_page=100&page=${page}`, {
          headers: { authorization: `bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'studio-os' },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        throw new AppException(502, 'GITHUB_UNREACHABLE', 'Não foi possível falar com o GitHub agora. Tente de novo em instantes.');
      }
      if (res.status === 401) throw new AppException(502, 'GITHUB_TOKEN_INVALID', 'O token do GitHub foi recusado (inválido ou expirado). Gere um novo e atualize no servidor.');
      if (res.status === 403 || res.status === 429) throw new AppException(502, 'GITHUB_RATE_LIMITED', 'O GitHub limitou as consultas por enquanto. Tente de novo mais tarde.');
      if (!res.ok) throw new AppException(502, 'GITHUB_ERROR', 'O GitHub respondeu com erro. Tente de novo mais tarde.');
      const batch = (await res.json()) as RawRepo[];
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  }
}

function toInfo(r: RawRepo, org: string | null): RepoInfo {
  return {
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    url: r.html_url,
    private: r.private,
    archived: r.archived,
    org,
    pushedAt: r.pushed_at,
  };
}
