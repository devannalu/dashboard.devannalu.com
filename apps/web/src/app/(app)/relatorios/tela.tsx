"use client";

import { projectCategoryLabel, projectStatusLabel, taskStatusLabel, type ReportsDto } from "@studio/contracts";
import type { ReactNode } from "react";
import { LoadError, PageHeader } from "@/components/app/common";
import { Card, CardHeader, Skeleton } from "@/components/ui/display";
import { fmtDayMonth } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/use-data";

/** Amostra mínima para mostrar percentuais (abaixo disso: "Dados insuficientes"). */
const MIN_SAMPLE = 3;

function Bars({ data, labels, title }: { data: Record<string, number>; labels: Record<string, string>; title: string }) {
  const entries = Object.entries(labels).map(([k, label]) => [label, data[k] ?? 0] as const);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <ul className="grid gap-2" aria-label={title}>
      {entries.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-2 text-sm">
          <span className="truncate">{label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="block h-full rounded-full bg-accent-text" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <b className="text-right font-mono">{n}</b>
        </li>
      ))}
    </ul>
  );
}

function How({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 text-xs text-text-2">
      <summary className="cursor-pointer font-semibold">Como calculamos</summary>
      <p className="mt-1">{children}</p>
    </details>
  );
}

/** Relatórios básicos (E16): só números de dados reais, cada um com a definição. */
export default function Relatorios() {
  const { ws } = useSession();
  const r = useData<ReportsDto>(ws("/reports"));
  const d = r.data;
  const weekMax = Math.max(1, ...(d?.completedPerWeek.map((w) => w.count) ?? [0]));

  return (
    <>
      <PageHeader title="seus" script="relatórios" description="Uma visão honesta do andamento: sem dados, sem número." />
      {r.error && <LoadError message={r.error} onRetry={r.reload} />}
      {!d ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Tarefas concluídas por semana" />
            <div className="flex h-40 items-end gap-2" role="img" aria-label={`Tarefas concluídas nas últimas 8 semanas: ${d.completedPerWeek.map((w) => w.count).join(", ")}`}>
              {d.completedPerWeek.map((w) => (
                <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-xs">{w.count}</span>
                  <span className="w-full rounded-t-md bg-accent-text" style={{ height: `${(w.count / weekMax) * 110}px`, minHeight: w.count ? 4 : 1 }} />
                  <span className="font-mono text-[10px] text-text-2">{fmtDayMonth(w.weekStart)}</span>
                </div>
              ))}
            </div>
            <How>Tarefas com data de conclusão em cada semana (domingo a sábado), nas últimas 8 semanas. Reabrir uma tarefa a remove da contagem.</How>
          </Card>

          <Card>
            <CardHeader title="Entregas no prazo" />
            {d.onTimeDelivery.total < MIN_SAMPLE ? (
              <p className="font-display text-2xl font-black text-text-2">Dados insuficientes</p>
            ) : (
              <p className="font-display text-6xl font-black">{d.onTimeDelivery.percent}%</p>
            )}
            <p className="mt-2 text-sm text-text-2">
              {d.onTimeDelivery.onTime} de {d.onTimeDelivery.total} entregas concluídas até a data-alvo.
            </p>
            <How>Marcos marcados como “Entrega”, concluídos e com data-alvo. Conta como no prazo se concluído até o fim do dia da data-alvo. Mostramos o percentual a partir de {MIN_SAMPLE} entregas.</How>
          </Card>

          <Card>
            <CardHeader title="Atenção" />
            <dl className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-field p-3">
                <dt className="label-mono">Tarefas atrasadas</dt>
                <dd className="mt-2 font-display text-4xl font-black">{d.overdueTasks}</dd>
              </div>
              <div className="rounded-xl border border-line bg-field p-3">
                <dt className="label-mono">Marcos atrasados</dt>
                <dd className="mt-2 font-display text-4xl font-black">{d.milestones.overdue}</dd>
              </div>
              <div className="rounded-xl border border-line bg-field p-3">
                <dt className="label-mono">Marcos concluídos</dt>
                <dd className="mt-2 font-display text-4xl font-black">
                  {d.milestones.completed}
                  <span className="text-base text-text-2">/{d.milestones.total}</span>
                </dd>
              </div>
            </dl>
            <How>Atrasado = data de vencimento anterior a hoje (fuso de Brasília) e ainda não concluído.</How>
          </Card>

          <Card>
            <CardHeader title="Tarefas por status" />
            <Bars data={d.tasksByStatus} labels={taskStatusLabel} title="Tarefas por status" />
          </Card>

          <Card>
            <CardHeader title="Projetos por status" />
            <Bars data={d.projectsByStatus} labels={projectStatusLabel} title="Projetos por status" />
          </Card>

          <Card>
            <CardHeader title="Projetos por categoria" />
            <Bars data={d.projectsByCategory} labels={projectCategoryLabel} title="Projetos por categoria" />
          </Card>
        </div>
      )}
    </>
  );
}
