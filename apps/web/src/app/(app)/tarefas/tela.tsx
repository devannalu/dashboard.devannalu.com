"use client";

import type { ProjectDto, TaskDto } from "@studio/contracts";
import { CheckSquare, Plus } from "lucide-react";
import { useState } from "react";
import { LoadError, PageHeader, PRIORITY_OPTS } from "@/components/app/common";
import { TaskBoard, TaskRow, TaskSheet, useTaskActions } from "@/components/app/tasks";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { addDays, todayYmd } from "@/lib/format";
import { useUrlSelection } from "@/lib/query";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";

type Due = "" | "overdue" | "today" | "week" | "none";

/** Tela global de tarefas (E6-6): todos os projetos e avulsas, com filtros, Kanban e lista. */
export default function Tarefas() {
  const { ws } = useSession();
  const [view, setView] = useState<"kanban" | "lista">("lista");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("");
  const [due, setDue] = useState<Due>("");
  const [showDone, setShowDone] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const tasks = useList<TaskDto>(ws(`/tasks${project ? `?projectId=${project}` : ""}`));
  const projects = useList<ProjectDto>(ws("/projects"));
  const actions = useTaskActions(tasks.reload);

  const [editing, setEditing] = useUrlSelection<TaskDto>(tasks.items);

  const today = todayYmd();
  const weekEnd = addDays(today, 7);
  const filtered = tasks.items.filter((t) => {
    const d = t.dueDate?.slice(0, 10);
    if (!showDone && view === "lista" && t.status === "DONE") return false;
    if (priority && t.priority !== priority) return false;
    if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (due === "overdue") return !!d && d < today && t.status !== "DONE";
    if (due === "today") return d === today;
    if (due === "week") return !!d && d >= today && d <= weekEnd;
    if (due === "none") return !d;
    return true;
  });
  // Lista: atrasadas e com data primeiro (por data), depois sem data.
  const sorted = [...filtered].sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

  return (
    <>
      <PageHeader
        title="suas"
        script="tarefas"
        description="Tudo o que precisa ser feito, de todos os projetos — e as avulsas."
        actions={
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setCreating(true)}>
            Nova tarefa
          </Button>
        }
      />
      <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
        <Input type="search" aria-label="Filtrar por título" placeholder="Filtrar…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-[220px]" />
        <Select aria-label="Projeto" value={project} onChange={(e) => setProject(e.target.value)} className="max-w-[220px]">
          <option value="">Todos os projetos</option>
          <option value="null">Avulsas (sem projeto)</option>
          {projects.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Vencimento" value={due} onChange={(e) => setDue(e.target.value as Due)} className="max-w-[180px]">
          <option value="">Qualquer data</option>
          <option value="overdue">Atrasadas</option>
          <option value="today">Hoje</option>
          <option value="week">Próximos 7 dias</option>
          <option value="none">Sem data</option>
        </Select>
        <Select aria-label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)} className="max-w-[160px]">
          <option value="">Toda prioridade</option>
          {PRIORITY_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {view === "lista" && (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="size-4 accent-accent" /> Mostrar concluídas
          </label>
        )}
        <div role="group" aria-label="Visualização" className="ml-auto flex rounded-xl border border-line bg-field p-1">
          {(["lista", "kanban"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold capitalize", view === v && "bg-accent text-white")}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {tasks.error && <LoadError message={tasks.error} onRetry={tasks.reload} />}
      {tasks.loading && !tasks.data ? (
        <Skeleton className="h-48" />
      ) : filtered.length === 0 && view === "lista" ? (
        <Card>
          <EmptyState
            icon={<CheckSquare aria-hidden />}
            title={tasks.items.length === 0 ? "tudo limpo" : "nada aqui"}
            description={tasks.items.length === 0 ? "Crie tarefas avulsas ou dentro dos projetos." : "Nenhuma tarefa com esses filtros."}
            action={<Button onClick={() => setCreating(true)}>Nova tarefa</Button>}
          />
        </Card>
      ) : view === "kanban" ? (
        <TaskBoard
          tasks={filtered}
          onOpen={setEditing}
          onToggle={(t, v) => void actions.toggle(t, v)}
          onMove={(t, status, position) => {
            tasks.setData((prev) => prev && { data: prev.data.map((x) => (x.id === t.id ? { ...x, status, position } : x)) });
            void actions.move(t, status, position);
          }}
        />
      ) : (
        <Card>
          <ul aria-label="Tarefas">
            {sorted.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={(v) => void actions.toggle(t, v)} onOpen={() => setEditing(t)} />
            ))}
          </ul>
        </Card>
      )}

      <TaskSheet
        open={editing !== null || creating}
        onOpenChange={(v) => {
          if (!v) {
            setEditing(null);
            setCreating(false);
          }
        }}
        task={editing}
        defaults={{ projectId: project && project !== "null" ? project : undefined, dueDate: due === "today" ? today : undefined }}
        onSaved={tasks.reload}
      />
    </>
  );
}
