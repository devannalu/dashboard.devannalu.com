"use client";

import type { CalendarItem, EventDto, ProjectDto, TaskDto } from "@studio/contracts";
import { ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import { useState } from "react";
import { LoadError, PageHeader } from "@/components/app/common";
import { clean, EntityForm } from "@/components/app/entity-form";
import { TaskSheet } from "@/components/app/tasks";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { addDays, fmtDate, fmtTime, isoToLocal, localToIso, MONTHS, todayYmd, WEEKDAYS, ymdOf } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";

type View = "mes" | "semana" | "agenda";

/** Início da semana (domingo, Q19) de uma data. */
function weekStart(ymd: string): string {
  return addDays(ymd, -new Date(`${ymd}T12:00:00Z`).getUTCDay());
}
function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}
function nextMonth(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}
function prevMonth(ymd: string): string {
  const [y, m] = ymd.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

function ItemChip({ item, onClick }: { item: CalendarItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold",
        item.kind === "event" ? "bg-accent text-white" : item.kind === "milestone" ? "border border-accent-text text-accent-text" : "bg-accent-soft text-text",
        item.done && "line-through opacity-60",
      )}
      title={item.title}
    >
      {item.kind === "milestone" && <Flag aria-hidden className="size-3 shrink-0" />}
      {item.kind === "event" && !item.allDay && <span className="font-mono">{fmtTime(item.date)}</span>}
      <span className="truncate">{item.title}</span>
    </button>
  );
}

/** Calendário (E8): visões mês, semana e agenda. Tarefas e marcos aparecem pela data; eventos são próprios. */
export default function Calendario() {
  const { ws } = useSession();
  const toast = useToast();
  const today = todayYmd();
  const [view, setView] = useState<View>("mes");
  const [cursor, setCursor] = useState(today);
  const [eventSheet, setEventSheet] = useState<{ event: EventDto | null; date?: string } | null>(null);
  const [task, setTask] = useState<TaskDto | null>(null);

  const range =
    view === "mes"
      ? { from: weekStart(monthStart(cursor)), to: addDays(weekStart(addDays(nextMonth(cursor), -1)), 7) }
      : view === "semana"
        ? { from: weekStart(cursor), to: addDays(weekStart(cursor), 7) }
        : { from: cursor, to: addDays(cursor, 30) };
  const cal = useList<CalendarItem>(ws(`/calendar?from=${range.from}&to=${range.to}`));
  const byDay = new Map<string, CalendarItem[]>();
  for (const i of cal.items) {
    const d = ymdOf(i.date);
    byDay.set(d, [...(byDay.get(d) ?? []), i]);
  }

  async function open(item: CalendarItem) {
    try {
      if (item.kind === "event") setEventSheet({ event: await api<EventDto>(ws(`/events/${item.id}`)) });
      if (item.kind === "task") setTask(await api<TaskDto>(ws(`/tasks/${item.id}`)));
      if (item.kind === "milestone") toast(`Marco${item.project ? ` de ${item.project.name}` : ""} — edite na aba Marcos do projeto.`);
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  function move(dir: -1 | 1) {
    if (view === "mes") setCursor(dir === 1 ? nextMonth(cursor) : prevMonth(cursor));
    else setCursor(addDays(cursor, dir * (view === "semana" ? 7 : 30)));
  }

  const [y, m] = cursor.split("-").map(Number) as [number, number];
  const title = view === "agenda" ? `a partir de ${fmtDate(cursor)}` : view === "semana" ? `semana de ${fmtDate(weekStart(cursor))}` : `${MONTHS[m - 1]} ${y}`;
  const days = Math.round((Date.parse(`${range.to}T12:00:00Z`) - Date.parse(`${range.from}T12:00:00Z`)) / 86_400_000);

  return (
    <>
      <PageHeader
        title="seu"
        script="calendário"
        description="Tarefas com vencimento, marcos e entregas dos projetos, e seus eventos."
        actions={
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setEventSheet({ event: null, date: today })}>
            Novo evento
          </Button>
        }
      />
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <IconButton label="Anterior" onClick={() => move(-1)}>
          <ChevronLeft aria-hidden />
        </IconButton>
        <IconButton label="Próximo" onClick={() => move(1)}>
          <ChevronRight aria-hidden />
        </IconButton>
        <Button variant="secondary" onClick={() => setCursor(today)}>
          Hoje
        </Button>
        <h2 className="font-display text-2xl font-black lowercase" aria-live="polite">
          {title}
        </h2>
        <div role="group" aria-label="Visão" className="ml-auto flex rounded-xl border border-line bg-field p-1">
          {([
            ["mes", "Mês"],
            ["semana", "Semana"],
            ["agenda", "Agenda"],
          ] as const).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", view === v && "bg-accent text-white")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {cal.error && <LoadError message={cal.error} onRetry={cal.reload} />}

      {view !== "agenda" ? (
        <Card className="overflow-x-auto p-3 sm:p-4">
          <div className="grid min-w-[640px] grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="label-mono px-2 py-2">
                {d}
              </div>
            ))}
            {Array.from({ length: days }, (_, i) => {
              const day = addDays(range.from, i);
              const items = byDay.get(day) ?? [];
              const outside = view === "mes" && day.slice(0, 7) !== cursor.slice(0, 7);
              return (
                <div key={day} className={cn("group flex flex-col gap-1 rounded-xl border border-line p-1.5", view === "mes" ? "min-h-28" : "min-h-72", outside && "opacity-45", day === today && "border-accent-text")}>
                  <div className="flex items-center">
                    <span className={cn("grid size-6 place-items-center rounded-md font-mono text-xs", day === today && "bg-accent font-bold text-white")}>{Number(day.slice(8))}</span>
                    <button
                      type="button"
                      aria-label={`Novo evento em ${fmtDate(day)}`}
                      onClick={() => setEventSheet({ event: null, date: day })}
                      className="ml-auto rounded-md px-1 text-text-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <Plus aria-hidden className="size-3.5" />
                    </button>
                  </div>
                  {items.slice(0, view === "mes" ? 3 : 12).map((it) => (
                    <ItemChip key={`${it.kind}-${it.id}`} item={it} onClick={() => void open(it)} />
                  ))}
                  {view === "mes" && items.length > 3 && <span className="px-1 text-[11px] text-text-2">+{items.length - 3} itens</span>}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          {cal.items.length === 0 ? (
            <p className="text-sm text-text-2">Nada nos próximos 30 dias.</p>
          ) : (
            <ol className="grid gap-4">
              {[...byDay.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([day, items]) => (
                  <li key={day}>
                    <p className={cn("label-mono mb-2", day === today && "text-accent-text")}>
                      {WEEKDAYS[new Date(`${day}T12:00:00Z`).getUTCDay()]} · {fmtDate(day)}
                      {day === today && " · hoje"}
                    </p>
                    <ul className="grid gap-1">
                      {items.map((it) => (
                        <li key={`${it.kind}-${it.id}`} className="flex items-center gap-3">
                          <span className="w-12 shrink-0 font-mono text-xs text-text-2">{it.kind === "event" && !it.allDay ? fmtTime(it.date) : "dia"}</span>
                          <button type="button" onClick={() => void open(it)} className={cn("min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-accent-text", it.done && "text-text-2 line-through")}>
                            {it.kind === "milestone" ? (it.isDelivery ? "Entrega: " : "Marco: ") : ""}
                            {it.title}
                          </button>
                          <span className="hidden truncate text-xs text-text-2 sm:inline">{it.project?.name ?? (it.kind === "task" ? "avulsa" : "")}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ol>
          )}
        </Card>
      )}
      <p className="glass justify-self-start rounded-xl px-3 py-2 text-xs text-text-2">
        <span className="mr-3 inline-block rounded bg-accent px-1.5 text-white">evento</span>
        <span className="mr-3 inline-block rounded bg-accent-soft px-1.5">tarefa</span>
        <span className="inline-block rounded border border-accent-text px-1.5 text-accent-text">marco</span>
      </p>

      <EventSheet value={eventSheet} onClose={() => setEventSheet(null)} onSaved={cal.reload} />
      <TaskSheet open={task !== null} onOpenChange={(v) => !v && setTask(null)} task={task} onSaved={cal.reload} />
    </>
  );
}

function EventSheet({ value, onClose, onSaved }: { value: { event: EventDto | null; date?: string } | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { ws } = useSession();
  const toast = useToast();
  const projects = useList<ProjectDto>(value ? ws("/projects") : null);
  const e = value?.event ?? null;
  const start = e ? isoToLocal(e.startsAt) : { date: value?.date ?? todayYmd(), time: "09:00" };
  const end = e?.endsAt ? isoToLocal(e.endsAt) : { date: start.date, time: e ? "" : "10:00" };
  return (
    <Sheet open={value !== null} onOpenChange={(v) => !v && onClose()} title={e ? "editar evento" : "novo evento"} description="Horários no fuso de Brasília.">
      {value && (
        <EntityForm
          key={e?.id ?? `novo-${value.date}`}
          initial={{ title: e?.title ?? "", date: start.date, start: start.time, end: end.time, allDay: e?.allDay ?? false, location: e?.location ?? "", projectId: e?.projectId ?? "", notes: e?.notes ?? "" }}
          fields={[
            { name: "title", label: "Título", required: true, wide: true },
            { name: "date", label: "Dia", type: "date", required: true },
            { name: "allDay", label: "Dia inteiro", type: "checkbox" },
            { name: "start", label: "Início", type: "time", when: (v) => v.allDay !== true },
            { name: "end", label: "Fim", type: "time", when: (v) => v.allDay !== true },
            { name: "location", label: "Local ou link" },
            { name: "projectId", label: "Projeto", type: "select", options: [{ value: "", label: "Sem projeto" }, ...projects.items.map((p) => ({ value: p.id, label: p.name }))] },
            { name: "notes", label: "Observações", type: "textarea" },
          ]}
          onSubmit={async (v) => {
            const c = clean(v);
            const allDay = v.allDay === true;
            const day = String(v.date);
            const body = {
              title: c.title,
              allDay,
              startsAt: localToIso(day, allDay ? "00:00" : String(v.start || "00:00")),
              endsAt: allDay || !v.end ? null : localToIso(day, String(v.end)),
              location: c.location,
              projectId: c.projectId,
              notes: c.notes,
            };
            if (e) await api(ws(`/events/${e.id}`), { method: "PATCH", body });
            else await api(ws("/events"), { method: "POST", body });
            toast(e ? "Evento salvo" : "Evento criado");
            onClose();
            await onSaved();
          }}
          onDelete={
            e
              ? async () => {
                  await api(ws(`/events/${e.id}`), { method: "DELETE" }).catch((err: unknown) => toast(errorMessage(err)));
                  onClose();
                  await onSaved();
                }
              : undefined
          }
        />
      )}
    </Sheet>
  );
}
