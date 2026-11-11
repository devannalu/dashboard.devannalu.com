import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GithubContributionsDto } from '@studio/contracts';
import { AppException } from '../common/problem.filter.js';
import { ENV, type Env } from '../config/env.js';

const GRAPHQL = 'https://api.github.com/graphql';
const CACHE_MS = 30 * 60 * 1000;

/** Consulta GraphQL do calendário de contribuições de quem é dono do token (o mesmo gráfico do perfil). */
const QUERY = `query($from: DateTime!, $to: DateTime!) {
  viewer {
    login
    url
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

interface GraphqlResponse {
  data?: {
    viewer?: {
      login: string;
      url: string;
      contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } };
    };
  };
  errors?: { message: string }[];
}

/**
 * Gráfico de contribuições do GitHub (D-37). Somente leitura, com o token pessoal do servidor.
 * Cache em memória de 30 min por período (evita gastar a cota do GitHub a cada visita ao Início).
 * O token nunca aparece em respostas, erros ou logs.
 */
@Injectable()
export class GithubContributionsService {
  private readonly log = new Logger('GitHub');
  private readonly cache = new Map<number, { at: number; value: GithubContributionsDto }>();

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  get configured(): boolean {
    return !!this.env.GITHUB_TOKEN;
  }

  async contributions(months: 3 | 6 | 12, now = new Date()): Promise<GithubContributionsDto> {
    if (!this.env.GITHUB_TOKEN) return { configured: false };
    const hit = this.cache.get(months);
    if (hit && now.getTime() - hit.at < CACHE_MS) return hit.value;

    const to = now;
    const from = new Date(now);
    if (months === 12) from.setUTCDate(from.getUTCDate() - 364);
    else from.setUTCMonth(from.getUTCMonth() - months);

    let res: Response;
    try {
      res = await this.fetchFn(GRAPHQL, {
        method: 'POST',
        headers: { authorization: `bearer ${this.env.GITHUB_TOKEN}`, 'content-type': 'application/json', 'user-agent': 'studio-os' },
        body: JSON.stringify({ query: QUERY, variables: { from: from.toISOString(), to: to.toISOString() } }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new AppException(502, 'GITHUB_UNREACHABLE', 'Não foi possível falar com o GitHub agora. Tente de novo em instantes.');
    }

    if (res.status === 401) {
      this.log.warn('GitHub recusou o token (401). Verifique GITHUB_TOKEN.');
      throw new AppException(502, 'GITHUB_TOKEN_INVALID', 'O token do GitHub foi recusado (inválido ou expirado). Gere um novo e atualize GITHUB_TOKEN no servidor.');
    }
    if (res.status === 403 || res.status === 429) {
      throw new AppException(502, 'GITHUB_RATE_LIMITED', 'O GitHub limitou as consultas por enquanto. Tente de novo mais tarde.');
    }
    if (!res.ok) throw new AppException(502, 'GITHUB_ERROR', 'O GitHub respondeu com erro. Tente de novo mais tarde.');

    const body = (await res.json()) as GraphqlResponse;
    const viewer = body.data?.viewer;
    if (!viewer) {
      this.log.warn({ errors: body.errors?.map((e) => e.message.slice(0, 200)) });
      throw new AppException(502, 'GITHUB_ERROR', 'O GitHub não devolveu o calendário de contribuições.');
    }

    const cal = viewer.contributionsCollection.contributionCalendar;
    const days = cal.weeks.flatMap((w) => w.contributionDays).map((d) => ({ date: d.date, count: d.contributionCount }));
    const value: GithubContributionsDto = {
      configured: true,
      login: viewer.login,
      profileUrl: viewer.url,
      total: cal.totalContributions,
      from: days[0]?.date,
      to: days.at(-1)?.date,
      days: days.filter((d) => d.count > 0),
    };
    this.cache.set(months, { at: now.getTime(), value });
    return value;
  }
}
