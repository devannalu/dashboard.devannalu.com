"use client";

import {
  activityKindLabel,
  dashboardLayoutSchema,
  projectCategoryLabel,
  type ActivityKind,
  type CalendarItem,
  type DashboardDto,
  type DashboardLayout,
  type TaskDto,
  type WidgetId,
  type WidgetSize,
} from "@studio/contracts";
import { ArrowLeft, ArrowRight, Check, EyeOff, GripVertical, LayoutGrid, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { DEFAULT_KINDS, GithubHeatmap, StudioHeatmap } from "@/components/app/activity-heatmap";
import { LoadError, ProjectStatusBadge } from "@/components/app/common";
import { TaskRow, TaskSheet, useTaskActions } from "@/components/app/tasks";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Progress, Skeleton } from "@/components/ui/display";
import { Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { addDays, fmtDayMonth, fmtTime, MONTHS, WEEKDAYS, ymdOf } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useData, useList } from "@/lib/use-data";

type LayoutItem = DashboardLayout["widgets"][number];

/** Disposição padrão (linhas de 12 colunas em telas grandes). */
const DEFAULT_LAYOUT: LayoutItem[] = [
  { id: "atividade", size: "full", hidden: false },
  { id: "hoje", size: "md", hidden: false },
  { id: "calendario", size: "md", hidden: false },
  { id: "projetos", size: "lg", hidden: false },
  { id: "kpi7", size: "sm", hidden: false },
  { id: "captura", size: "sm", hidden: false },
  { id: "agora", size: "sm", hidden: false },
  { id: "notas", size: "sm", hidden: false },
];

const TITLES: Record<WidgetId, string> = {
  atividade: "Gráfico de contribuições",
  hoje: "Hoje",
  calendario: "Calendário",
  projetos: "Projetos ativos",
  kpi7: "Últimos 7 dias",
  agora: "Agora",
  captura: "Captura rápida",
  notas: "Notas recentes",
};

/** Largura do widget: 1 coluna no celular, 2 no tablet, 12 colunas no desktop. */
const SPAN: Record<WidgetSize, string> = {
  sm: "md:col-span-1 xl:col-span-4",
  md: "md:col-span-1 xl:col-span-6",
  lg: "md:col-span-2 xl:col-span-8",
  full: "md:col-span-2 xl:col-span-12",
};
const SIZE_LABEL: Record<WidgetSize, string> = { sm: "P", md: "M", lg: "G", full: "Inteiro" };

/** Junta o que está salvo com o padrão (widgets novos entram no fim; desconhecidos saem). */
function mergeLayout(saved: unknown): LayoutItem[] {
  const parsed = dashboardLayoutSchema.safeParse(saved);
  if (!parsed.success) return DEFAULT_LAYOUT;
  const known = parsed.data.widgets;
  return [...known, ...DEFAULT_LAYOUT.filter((d) => !known.some((k) => k.id === d.id))];
}

function greeting(): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "bom dia" : h < 18 ? "boa tarde" : "boa noite";
}

export default function Inicio() {
  const { ws, me, refresh } = useSession();
  const toast = useToast();
  const dash = useData<DashboardDto>(ws("/dashboard"));
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const actions = useTaskActions(dash.reload);
  const [layout, setLayout] = useState<LayoutItem[]>(() => mergeLayout(me.user.dashboardLayout));
  const [customizing, setCustomizing] = useState(false);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [saveState, setSaveState] = useState<"salvo" | "salvando" | "erro">("salvo");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const d = dash.data;

  /** Aplica a mudança na hora e salva na conta (com pequena espera para agrupar cliques). */
  function update(next: LayoutItem[]) {
    setLayout(next);
    setSaveState("salvando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api("/api/auth/me/dashboard", { method: "PUT", body: { widgets: next } })
        .then(() => {
          setSaveState("salvo");
          void refresh(); // a sessão em memória passa a ter a disposição nova
        })
        .catch((e: unknown) => {
          setSaveState("erro");
          toast(errorMessage(e));
        });
    }, 500);
  }
  const patch = (id: WidgetId, p: Partial<LayoutItem>) => update(layout.map((w) => (w.id === id ? { ...w, ...p } : w)));
  function move(id: WidgetId, dir: -1 | 1) {
    const visible = layout.filter((w) => !w.hidden);
    const idx = visible.findIndex((w) => w.id === id);
    const other = visible[idx + dir];
    if (!other) return;
    const next = [...layout];
    const a = next.findIndex((w) => w.id === id);
    const b = next.findIndex((w) => w.id === other.id);
    [next[a], next[b]] = [next[b]!, next[a]!];
    update(next);
  }
  function dropOn(target: WidgetId, e: DragEvent) {
    e.preventDefault();
    if (!dragId || dragId === target) return;
    const item = layout.find((w) => w.id === dragId)!;
    const rest = layout.filter((w) => w.id !== dragId);
    const at = rest.findIndex((w) => w.id === target);
    rest.splice(at, 0, item);
    update(rest);
    setDragId(null);
  }

  const visible = layout.filter((w) => !w.hidden);
  const hidden = layout.filter((w) => w.hidden);

  const widgets: Record<WidgetId, (w: LayoutItem) => ReactNode> = {
    atividade: (w) => <ActivityWidget config={w.config} onConfig={(config) => patch("atividade", { config })} />,
    hoje: () => (
      <Card aria-labelledby="h-hoje" className="h-full">
        <CardHeader id="h-hoje" title="Hoje" action={<Link href="/tarefas">Todas as tarefas</Link>} />
        {!d ? (
          <Skeleton className="h-24" />
        ) : d.todayTasks.length === 0 && d.overdueTasks.length === 0 ? (
          <EmptyState title="dia livre" description="Nenhuma tarefa vence hoje. Use a captura rápida ou planeje a semana em Tarefas." />
        ) : (
          <>
            {d.todayTasks.length > 0 ? (
              <ul aria-label="Tarefas de hoje">
                {d.todayTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={(v) => void actions.toggle(t, v)} onOpen={() => setEditingTask(t)} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-2">Nada vence hoje.</p>
            )}
            {d.overdueTasks.length > 0 && (
              <>
                <p className="label-mono mt-5 mb-1 text-danger">Atrasadas · {d.counts.overdueTasks}</p>
                <ul aria-label="Tarefas atrasadas">
                  {d.overdueTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={(v) => void actions.toggle(t, v)} onOpen={() => setEditingTask(t)} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </Card>
    ),
    calendario: () => (
      <Card aria-labelledby="h-cal" className="h-full">
        <CardHeader id="h-cal" title="Calendário" action={<Link href="/calendario">Abrir</Link>} />
        {!d ? (
          <Skeleton className="h-48" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <MiniMonth today={d.today} />
            <div>
              <p className="label-mono mb-2">Próximos 14 dias</p>
              {d.upcoming.length === 0 ? (
                <p className="text-sm text-text-2">Nada agendado.</p>
              ) : (
                <ul className="grid gap-2">
                  {d.upcoming.map((i) => (
                    <li key={`${i.kind}-${i.id}`} className="flex gap-3 border-t border-line pt-2 first:border-0 first:pt-0">
                      <span className="w-12 shrink-0 font-mono text-xs leading-tight text-text-2">
                        {fmtDayMonth(ymdOf(i.date))}
                        {i.kind === "event" && !i.allDay && (
                          <>
                            <br />
                            {fmtTime(i.date)}
                          </>
                        )}
                      </span>
                      <span className="min-w-0">
                        <b className="block truncate text-sm">
                          {i.kind === "milestone" ? (i.isDelivery ? "Entrega: " : "Marco: ") : ""}
                          {i.title}
                        </b>
                        <small className="block truncate text-xs text-text-2">
                          {i.kind === "task" ? "tarefa" : i.kind === "event" ? "evento" : "marco"}
                          {i.project ? ` · ${i.project.name}` : ""}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>
    ),
    projetos: () => (
      <Card aria-labelledby="h-proj" className="h-full">
        <CardHeader id="h-proj" title="Projetos ativos" action={<Link href="/projetos">Ver todos</Link>} />
        {!d ? (
          <Skeleton className="h-28" />
        ) : d.activeProjects.length === 0 ? (
          <EmptyState title="sem projetos ativos" description="Projetos com status “Em andamento” aparecem aqui com o progresso das tarefas." action={<Link className="font-bold text-accent-text underline" href="/projetos?novo=1">Criar projeto</Link>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d.activeProjects.map((p) => (
              <Link key={p.id} href={`/projetos/${p.id}`} className="grid gap-2 rounded-xl border border-line bg-field p-4 hover:border-accent-text">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent font-display font-black text-white">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate">{p.name}</b>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-text-2">
                      {projectCategoryLabel[p.category]} · <ProjectStatusBadge status={p.status} />
                    </span>
                  </span>
                </span>
                <Progress value={p.progress?.percent ?? null} label={`Progresso de ${p.name}`} />
                <span className="font-mono text-xs text-text-2">
                  {p.progress && p.progress.total > 0 ? `${p.progress.done} de ${p.progress.total} tarefas` : ""}
                  {p.dueDate ? ` · entrega ${fmtDayMonth(p.dueDate)}` : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    ),
    kpi7: () => (
      <Card aria-labelledby="h-kpi" className="h-full">
        <CardHeader id="h-kpi" title="Últimos 7 dias" action={<Link href="/relatorios">Relatórios</Link>} />
        {!d ? (
          <Skeleton className="h-24" />
        ) : (
          <dl className="grid grid-cols-2 gap-3">
            {[
              ["Tarefas concluídas", d.last7Days.tasksCompleted],
              ["Tarefas criadas", d.last7Days.tasksCreated],
              ["Notas escritas", d.last7Days.notesWritten],
              ["Ideias capturadas", d.last7Days.ideasCaptured],
            ].map(([label, n]) => (
              <div key={label} className="rounded-xl border border-line bg-field p-3">
                <dt className="label-mono leading-snug">{label}</dt>
                <dd className="mt-2 font-display text-4xl font-black">{n}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    ),
    agora: () => (
      <Card aria-labelledby="h-agora" className="h-full">
        <CardHeader id="h-agora" title="Agora" />
        {d && (
          <ul className="grid gap-2 text-sm">
            <li className="flex justify-between"><span>Tarefas abertas</span><b className="font-mono">{d.counts.openTasks}</b></li>
            <li className="flex justify-between"><span>Vencem hoje</span><b className="font-mono">{d.counts.dueToday}</b></li>
            <li className={cn("flex justify-between", d.counts.overdueTasks > 0 && "font-bold text-danger")}><span>Atrasadas</span><b className="font-mono">{d.counts.overdueTasks}</b></li>
            <li className="flex justify-between"><span>Ideias em aberto</span><b className="font-mono">{d.counts.ideas}</b></li>
            <li className="flex justify-between"><Link href="/notas" className="underline">Notas na Inbox</Link><b className="font-mono">{d.counts.inboxNotes}</b></li>
          </ul>
        )}
      </Card>
    ),
    captura: () => (
      <Card aria-labelledby="h-cap" className="h-full">
        <CardHeader id="h-cap" title="Captura rápida" />
        <QuickCapture onSaved={dash.reload} />
      </Card>
    ),
    notas: () => (
      <Card aria-labelledby="h-notas" className="h-full">
        <CardHeader id="h-notas" title="Notas recentes" action={<Link href="/notas">Abrir notas</Link>} />
        {d && d.recentNotes.length === 0 && <p className="text-sm text-text-2">Nenhuma nota ainda.</p>}
        <ul className="grid gap-2">
          {d?.recentNotes.map((n) => (
            <li key={n.id} className="border-t border-line pt-2 first:border-0 first:pt-0">
              <Link href={`/notas?abrir=${n.id}`} className="block hover:text-accent-text">
                <b className="block truncate text-sm">{n.title || "Nota sem título"}</b>
                <span className="line-clamp-2 text-xs text-text-2">{n.content || "—"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    ),
  };

  return (
    <>
      <div className="glass flex flex-wrap items-end gap-4 rounded-[22px] px-5 py-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="label-mono mb-2">{d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${d.today}T12:00:00Z`)) : " "}</p>
          <h1 className="font-display text-4xl leading-none font-black tracking-tighter lowercase sm:text-6xl">
            {greeting()}, <em className="font-script text-6xl font-normal tracking-normal normal-case not-italic text-accent-text sm:text-8xl">{me.user.name.split(" ")[0]}</em>
          </h1>
        </div>
        {customizing ? (
          <Button icon={<Check aria-hidden className="size-4" />} onClick={() => setCustomizing(false)}>
            Concluir
          </Button>
        ) : (
          <Button variant="secondary" icon={<LayoutGrid aria-hidden className="size-4" />} onClick={() => setCustomizing(true)}>
            Personalizar
          </Button>
        )}
      </div>

      {customizing && (
        <div role="region" aria-label="Personalizar o início" className="glass grid gap-3 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              <b>Arraste</b> os widgets para reordenar (ou use as setas), escolha o <b>tamanho</b> e esconda o que não usa.
            </p>
            <span role="status" className={cn("label-mono ml-auto", saveState === "erro" ? "text-danger" : saveState === "salvo" ? "text-success" : "")}>
              {saveState === "salvo" ? "Salvo na sua conta" : saveState === "salvando" ? "Salvando…" : "Erro ao salvar"}
            </span>
            <Button size="sm" variant="ghost" icon={<RotateCcw aria-hidden className="size-3.5" />} onClick={() => update(DEFAULT_LAYOUT)}>
              Restaurar padrão
            </Button>
          </div>
          {hidden.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="label-mono">Escondidos:</span>
              {hidden.map((w) => (
                <Button key={w.id} size="sm" variant="secondary" icon={<Plus aria-hidden className="size-3.5" />} onClick={() => patch(w.id, { hidden: false })}>
                  {TITLES[w.id]}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {dash.error && <LoadError message={dash.error} onRetry={dash.reload} />}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
        {visible.map((w, i) => (
          <section
            key={w.id}
            aria-label={TITLES[w.id]}
            draggable={customizing}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              setDragId(w.id);
            }}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => customizing && e.preventDefault()}
            onDrop={(e) => dropOn(w.id, e)}
            className={cn("relative min-w-0", SPAN[w.size], customizing && "cursor-grab rounded-[24px] outline-2 outline-offset-4 outline-dashed outline-accent-text/50", dragId === w.id && "opacity-40")}
          >
            {customizing && (
              <div className="glass absolute -top-3 right-3 z-10 flex items-center gap-0.5 rounded-xl bg-glass-strong p-1 shadow-glass">
                <span className="px-1 text-text-2" aria-hidden title="Arraste para mover">
                  <GripVertical className="size-4" />
                </span>
                <IconButton variant="ghost" className="size-8" label={`Mover ${TITLES[w.id]} para trás`} disabled={i === 0} onClick={() => move(w.id, -1)}>
                  <ArrowLeft aria-hidden />
                </IconButton>
                <IconButton variant="ghost" className="size-8" label={`Mover ${TITLES[w.id]} para frente`} disabled={i === visible.length - 1} onClick={() => move(w.id, 1)}>
                  <ArrowRight aria-hidden />
                </IconButton>
                <div role="radiogroup" aria-label={`Tamanho de ${TITLES[w.id]}`} className="mx-1 flex rounded-lg border border-line">
                  {(Object.keys(SIZE_LABEL) as WidgetSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={w.size === s}
                      onClick={() => patch(w.id, { size: s })}
                      className={cn("px-2 py-1 font-mono text-[11px] font-bold", w.size === s ? "bg-accent text-white" : "text-text-2 hover:text-text")}
                    >
                      {SIZE_LABEL[s]}
                    </button>
                  ))}
                </div>
                <IconButton variant="ghost" className="size-8" label={`Esconder ${TITLES[w.id]}`} onClick={() => patch(w.id, { hidden: true })}>
                  <EyeOff aria-hidden />
                </IconButton>
              </div>
            )}
            <div className={cn("h-full", customizing && "pointer-events-none select-none")}>{widgets[w.id](w)}</div>
          </section>
        ))}
      </div>

      {visible.length === 0 && (
        <Card>
          <EmptyState title="início vazio" description="Você escondeu todos os widgets. Use “Personalizar” para trazer de volta." action={<Button onClick={() => update(DEFAULT_LAYOUT)}>Restaurar padrão</Button>} />
        </Card>
      )}

      <TaskSheet open={editingTask !== null} onOpenChange={(v) => !v && setEditingTask(null)} task={editingTask} onSaved={dash.reload} />
    </>
  );
}

/** Widget do gráfico de atividade, com ajustes (o que contar e período) salvos na disposição. */
function ActivityWidget({ config, onConfig }: { config: LayoutItem["config"]; onConfig: (c: NonNullable<LayoutItem["config"]>) => void }) {
  const [open, setOpen] = useState(false);
  const source = config?.source ?? "github";
  const kinds = config?.kinds ?? DEFAULT_KINDS;
  const months = config?.months ?? 12;
  const set = (p: Partial<NonNullable<LayoutItem["config"]>>) => onConfig({ source, kinds, months, ...p });
  const toggle = (k: ActivityKind) => {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k];
    if (next.length > 0) set({ kinds: next });
  };
  return (
    <Card aria-labelledby="h-ativ" className="h-full">
      <CardHeader
        id="h-ativ"
        title={source === "github" ? "Contribuições no GitHub" : "Atividade no Studio"}
        action={
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="pointer-events-auto inline-flex items-center gap-1.5">
            <SlidersHorizontal aria-hidden className="size-4" /> Ajustar
          </button>
        }
      />
      {open && (
        <div className="mb-4 grid gap-3 rounded-xl border border-line bg-field p-3">
          <div role="radiogroup" aria-label="Fonte do gráfico" className="flex flex-wrap gap-2">
            {([
              ["github", "Contribuições do GitHub"],
              ["studio", "Atividade no Studio"],
            ] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={source === v}
                onClick={() => set({ source: v })}
                className={cn("rounded-lg border px-3 py-1.5 text-sm font-semibold", source === v ? "border-accent bg-accent text-white" : "border-line text-text-2 hover:text-text")}
              >
                {label}
              </button>
            ))}
          </div>
          {source === "studio" && (
          <fieldset>
            <legend className="label-mono mb-2">O que conta como atividade</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {(Object.keys(activityKindLabel) as ActivityKind[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={kinds.includes(k)} onChange={() => toggle(k)} className="size-4 accent-accent" disabled={kinds.length === 1 && kinds.includes(k)} />
                  {activityKindLabel[k]}
                </label>
              ))}
            </div>
          </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm">
            <span className="label-mono">Período</span>
            <Select value={String(months)} onChange={(e) => set({ months: Number(e.target.value) as 3 | 6 | 12 })} className="h-9 max-w-[160px]">
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </Select>
          </label>
          <p className="text-xs text-text-2">
            {source === "github"
              ? "Os mesmos quadradinhos do seu perfil no GitHub (commits, PRs, issues e revisões). Só leitura; nunca mudam o progresso dos projetos."
              : "Atividade mostra o seu ritmo no Studio; não muda o progresso dos projetos, que vem só das tarefas concluídas."}
          </p>
        </div>
      )}
      {source === "github" ? <GithubHeatmap months={months} /> : <StudioHeatmap kinds={kinds} months={months} />}
    </Card>
  );
}

/** Mês atual com marcação dos dias que têm itens (dados do endpoint de calendário). */
function MiniMonth({ today }: { today: string }) {
  const { ws } = useSession();
  const [y, m] = today.split("-").map(Number) as [number, number];
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const cal = useList<CalendarItem>(ws(`/calendar?from=${first}&to=${next}`));
  const days = new Set(cal.items.map((i) => ymdOf(i.date)));
  const offset = new Date(`${first}T12:00:00Z`).getUTCDay();
  const total = Math.round((Date.parse(`${next}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86_400_000);
  return (
    <div>
      <p className="mb-2 font-display font-black lowercase">
        <em className="font-script text-3xl font-normal not-italic normal-case text-accent-text">{MONTHS[m - 1]}</em> {y}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label={`Calendário de ${MONTHS[m - 1]}`}>
        {WEEKDAYS.map((wd) => (
          <span key={wd} className="label-mono py-1">
            {wd.slice(0, 1)}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const day = addDays(first, i);
          const isToday = day === today;
          return (
            <span
              key={day}
              className={cn("relative grid aspect-square place-items-center rounded-lg font-mono", isToday ? "bg-accent font-bold text-white" : "text-text")}
              aria-label={`${i + 1}${days.has(day) ? ", com itens" : ""}${isToday ? ", hoje" : ""}`}
            >
              {i + 1}
              {days.has(day) && <span aria-hidden className={cn("absolute bottom-1 size-1 rounded-full", isToday ? "bg-white" : "bg-accent-text")} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function QuickCapture({ onSaved }: { onSaved: () => void }) {
  const { ws } = useSession();
  const toast = useToast();
  const [text, setText] = useState("");
  const [kind, setKind] = useState("note");
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const [first, ...rest] = text.trim().split("\n");
    if (!first) return;
    setSaving(true);
    try {
      const body = kind === "note" ? { title: first.slice(0, 200), content: rest.join("\n") } : { title: first.slice(0, 300), description: rest.join("\n") || null };
      await api(ws(kind === "note" ? "/notes" : kind === "task" ? "/tasks" : "/ideas"), { method: "POST", body });
      toast(kind === "note" ? "Nota salva na Inbox" : kind === "task" ? "Tarefa criada" : "Ideia guardada");
      setText("");
      onSaved();
    } catch (err) {
      toast(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-2">
      <Textarea aria-label="Texto da captura" rows={3} placeholder="Uma ideia, uma tarefa, um lembrete…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <Select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)} className="flex-1">
          <option value="note">Nota</option>
          <option value="task">Tarefa</option>
          <option value="idea">Ideia</option>
        </Select>
        <Button type="submit" loading={saving} disabled={!text.trim()}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
