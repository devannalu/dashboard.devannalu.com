"use client";

import { activityKindLabel, type ActivityDto, type ActivityKind, type GithubContributionsDto } from "@studio/contracts";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { addDays, fmtDate, MONTHS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/use-data";
import { Skeleton } from "../ui/display";
import { LoadError } from "./common";

export const DEFAULT_KINDS: ActivityKind[] = ["tasksCompleted", "tasksCreated", "notesCreated", "ideasCreated"];

/** Intensidade por nível: escala própria do gráfico (tokens --heat-0…4, claro e escuro). */
const LEVEL_STYLE = [0, 1, 2, 3, 4].map((i) => ({ background: `var(--heat-${i})` }));

function level(n: number, max: number): number {
  if (n <= 0) return 0;
  if (max <= 4) return Math.min(4, n);
  return Math.min(4, Math.ceil((n / max) * 4));
}

function streaks(dates: Set<string>, to: string): { current: number; best: number } {
  let current = 0;
  let d = dates.has(to) ? to : addDays(to, -1); // hoje ainda pode não ter atividade
  while (dates.has(d)) {
    current += 1;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  for (const day of [...dates].sort()) {
    run = dates.has(addDays(day, -1)) ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best };
}

/**
 * Desenho do gráfico estilo GitHub: um quadrado por dia, colunas por semana (domingo a sábado).
 * Recebe as contagens prontas — serve tanto para o GitHub quanto para a atividade do Studio.
 */
function HeatmapView({ from, to, counts, detail, months, unit, total }: { from: string; to: string; counts: Map<string, number>; detail: (date: string, n: number) => string; months: number; unit: string; total?: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  // Começa mostrando o fim (semana atual), como no GitHub.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [from, to]);

  const sum = total ?? [...counts.values()].reduce((s, n) => s + n, 0);
  const max = Math.max(0, ...counts.values());
  const { current, best } = streaks(new Set(counts.keys()), to);
  const start = addDays(from, -new Date(`${from}T12:00:00Z`).getUTCDay());
  const weeks: string[][] = [];
  for (let d = start; d <= to; d = addDays(d, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)));
  const summary = `${sum} ${unit} nos últimos ${months} meses. Sequência atual: ${current} dia${current === 1 ? "" : "s"}. Maior sequência: ${best}.`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <p>
          <b className="font-display text-3xl font-black">{sum}</b> <span className="text-sm text-text-2">{unit} em {months} meses</span>
        </p>
        <p className="text-sm text-text-2">
          sequência atual <b className="font-mono text-text">{current}d</b> · maior <b className="font-mono text-text">{best}d</b>
        </p>
      </div>

      <div ref={scroller} className="overflow-x-auto pb-1">
        {/* Os quadrados esticam para ocupar o card (mín. 7px, com rolagem; máx. 18px). */}
        <div
          role="img"
          aria-label={summary}
          className="grid gap-0.75"
          style={{ gridTemplateColumns: `22px repeat(${weeks.length}, minmax(7px, 1fr))`, maxWidth: `calc(22px + ${weeks.length} * 21px)` }}
        >
          <span />
          {weeks.map((w, i) => {
            const monthStart = w.find((d) => d.endsWith("-01"));
            const label = i === 0 ? Number(w[6]!.slice(5, 7)) : monthStart ? Number(monthStart.slice(5, 7)) : 0;
            return (
              <span key={`m${i}`} className="h-4 overflow-visible font-mono text-[10px] whitespace-nowrap text-text-2">
                {label ? MONTHS[label - 1]!.slice(0, 3) : ""}
              </span>
            );
          })}
          {Array.from({ length: 7 }, (_, row) => (
            <Row key={row} row={row} weeks={weeks} from={from} to={to} counts={counts} detail={detail} max={max} />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 text-[11px] text-text-2" aria-hidden>
        menos
        {LEVEL_STYLE.map((st, i) => (
          <span key={i} className="size-3 rounded-[3px]" style={st} />
        ))}
        mais
      </div>
    </div>
  );
}

const ROW_LABEL = ["", "seg", "", "qua", "", "sex", ""];

function Row({ row, weeks, from, to, counts, detail, max }: { row: number; weeks: string[][]; from: string; to: string; counts: Map<string, number>; detail: (date: string, n: number) => string; max: number }) {
  return (
    <>
      <span className="self-center font-mono text-[10px] leading-3 text-text-2">{ROW_LABEL[row]}</span>
      {weeks.map((w) => {
        const day = w[row]!;
        if (day < from || day > to) return <span key={day} className="aspect-square" />;
        const n = counts.get(day) ?? 0;
        const lv = level(n, max);
        return (
          <span
            key={day}
            title={`${fmtDate(day)}: ${detail(day, n)}`}
            className={cn("aspect-square w-full rounded-[3px]", day === to && "ring-1 ring-text")}
            style={LEVEL_STYLE[lv]}
          />
        );
      })}
    </>
  );
}

/** Contribuições do seu perfil no GitHub (commits, PRs, issues e revisões), via API oficial. */
export function GithubHeatmap({ months }: { months: 3 | 6 | 12 }) {
  const { ws } = useSession();
  const gh = useData<GithubContributionsDto>(ws(`/github/contributions?months=${months}`));
  if (gh.error) return <LoadError message={gh.error} onRetry={gh.reload} />;
  if (!gh.data) return <Skeleton className="h-32" />;
  const d = gh.data;
  if (!d.configured || !d.from || !d.to) {
    return (
      <div className="grid gap-2 rounded-xl border border-dashed border-line p-4 text-sm">
        <p className="font-bold">Conecte seu GitHub para ver suas contribuições aqui.</p>
        <ol className="list-decimal space-y-1 pl-5 text-text-2">
          <li>
            No GitHub, crie um token em <b>Settings → Developer settings → Personal access tokens → Fine-grained</b>, só com acesso de leitura.
          </li>
          <li>
            Coloque o token na variável <code className="font-mono">GITHUB_TOKEN</code> do servidor (no computador: arquivo <code className="font-mono">.env</code>; no site: Coolify).
          </li>
          <li>Reinicie a API. O gráfico aparece sozinho.</li>
        </ol>
      </div>
    );
  }
  const counts = new Map((d.days ?? []).map((x) => [x.date, x.count]));
  return (
    <div className="grid gap-2">
      <HeatmapView
        from={d.from}
        to={d.to}
        counts={counts}
        total={d.total}
        months={months}
        unit="contribuições"
        detail={(_, n) => (n ? `${n} contribuição${n === 1 ? "" : "ões"} no GitHub` : "nenhuma contribuição")}
      />
      {d.profileUrl && (
        <a href={d.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 justify-self-start text-xs font-bold text-accent-text hover:underline">
          @{d.login} no GitHub <ExternalLink aria-hidden className="size-3" />
        </a>
      )}
    </div>
  );
}

/** Atividade registrada no Studio (tarefas, notas, ideias…), com os tipos escolhidos pela usuária. */
export function StudioHeatmap({ kinds, months }: { kinds: ActivityKind[]; months: 3 | 6 | 12 }) {
  const { ws } = useSession();
  const days = months === 12 ? 365 : months * 31;
  const act = useData<ActivityDto>(ws(`/activity?days=${days}`));
  if (act.error) return <LoadError message={act.error} onRetry={act.reload} />;
  if (!act.data) return <Skeleton className="h-32" />;
  const counts = new Map<string, number>();
  const parts = new Map<string, string>();
  for (const d of act.data.days) {
    const n = kinds.reduce((s, k) => s + (d[k] ?? 0), 0);
    if (n > 0) {
      counts.set(d.date, n);
      parts.set(d.date, kinds.filter((k) => (d[k] ?? 0) > 0).map((k) => `${d[k]} ${activityKindLabel[k].toLowerCase()}`).join(", "));
    }
  }
  return <HeatmapView from={act.data.from} to={act.data.to} counts={counts} months={months} unit="atividades" detail={(day, n) => (n ? parts.get(day)! : "nenhuma atividade")} />;
}
