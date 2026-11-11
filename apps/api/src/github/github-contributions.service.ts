import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GithubContributionsDto } from '@studio/contracts';
import { AppException } from '../common/problem.filter.js';
import { ENV, type Env } from '../config/env.js';

const GRAPHQL = 'https://api.github.com/graphql';
const CACHE_MS = 30 * 60 * 1000;

const CALENDAR = `contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }`;

/** 1) Calendário visto pelo dono do token (limitado ao que o token enxerga). */
const VIEWER_QUERY = `query($from: DateTime!, $to: DateTime!) {
  viewer {
    login
    url
    ${CALENDAR}
  }
}`;

/**
 * 2) Calendário do perfil público: inclui as contribuições privadas (só a contagem, anônima) quando a
 * opção "Private contributions" está ligada no perfil — é o gráfico que aparece no github.com.
 */
const PROFILE_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    ${CALENDAR}
  }
}`;

type Calendar = { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number }[] }[] };

interface GraphqlResponse {
  data?: {
    viewer?: { login: string; url: string; contributionsCollection: { contributionCalendar: Calendar } };
    user?: { contributionsCollection: { contributionCalendar: Calendar } } | null;
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

    const vars = { from: from.toISOString(), to: to.toISOString() };
    const body = await this.query(VIEWER_QUERY, vars);
    const viewer = body.data?.viewer;
    if (!viewer) {
      this.log.warn({ errors: body.errors?.map((e) => e.message.slice(0, 200)) });
      throw new AppException(502, 'GITHUB_ERROR', 'O GitHub não devolveu o calendário de contribuições.');
    }

    // Visão do perfil público (com as privadas anônimas). Se falhar, fica só a do token.
    let profile: Calendar | undefined;
    try {
      profile = (await this.query(PROFILE_QUERY, { ...vars, login: viewer.login })).data?.user?.contributionsCollection.contributionCalendar;
    } catch {
      this.log.warn('Calendário do perfil público indisponível; usando só a visão do token.');
    }

    // Por dia, o maior número entre as duas visões do mesmo perfil.
    const counts = new Map<string, number>();
    for (const cal of [viewer.contributionsCollection.contributionCalendar, profile]) {
      for (const d of cal?.weeks.flatMap((w) => w.contributionDays) ?? []) counts.set(d.date, Math.max(counts.get(d.date) ?? 0, d.contributionCount));
    }
    const days = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    const value: GithubContributionsDto = {
      configured: true,
      login: viewer.login,
      profileUrl: viewer.url,
      total: days.reduce((s, d) => s + d.count, 0),
      from: days[0]?.date,
      to: days.at(-1)?.date,
      days: days.filter((d) => d.count > 0),
    };
    this.cache.set(months, { at: now.getTime(), value });
    return value;
  }

  /** Uma consulta GraphQL somente leitura, com erros amigáveis (o token nunca aparece). */
  private async query(query: string, variables: Record<string, string>): Promise<GraphqlResponse> {
    let res: Response;
    try {
      res = await this.fetchFn(GRAPHQL, {
        method: 'POST',
        headers: { authorization: `bearer ${this.env.GITHUB_TOKEN}`, 'content-type': 'application/json', 'user-agent': 'studio-os' },
        body: JSON.stringify({ query, variables }),
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
    return (await res.json()) as GraphqlResponse;
  }
}
