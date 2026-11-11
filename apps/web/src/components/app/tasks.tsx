"use client";

import { taskStatusLabel, type MilestoneDto, type ProjectDto, type TaskDto, type TaskStatus } from "@studio/contracts";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useState, type DragEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDue, todayYmd } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";
import { ConfirmDialog, Sheet } from "../ui/overlay";
import { useToast } from "../ui/toast";
import { CherryCheck, PRIORITY_OPTS, PriorityText, TASK_STATUS_OPTS } from "./common";
import { clean, EntityForm, type FormValues } from "./entity-form";

/** Ações de tarefa compartilhadas pelas telas (concluir, mover, salvar), com atualização otimista. */
export function useTaskActions(onChanged: () => void | Promise<void>) {
  const { ws } = useSession();
  const toast = useToast();
  async function patch(task: TaskDto, data: Partial<TaskDto>, message?: string) {
    try {
      await api(ws(`/tasks/${task.id}`), { method: "PATCH", body: data });
      if (message) toast(message);
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      await onChanged();
    }
  }
  return {
    toggle: (task: TaskDto, done: boolean) =>
      patch(task, { status: done ? "DONE" : "TODO" }, done ? "Tarefa concluída 🍒" : "Tarefa reaberta"),
    move: (task: TaskDto, status: TaskStatus, position?: number) => patch(task, { status, ...(position !== undefined ? { position } : {}) }),
  };
}

/** Linha de tarefa: check de cereja, título, projeto, vencimento e prioridade. */
export function TaskRow({ task, onToggle, onOpen, showProject = true }: { task: TaskDto; onToggle: (done: boolean) => void; onOpen: () => void; showProject?: boolean }) {
  const done = task.status === "DONE";
  const today = todayYmd();
  const overdue = !done && task.dueDate && task.dueDate.slice(0, 10) < today;
  return (
    <li className="flex items-center gap-3 border-t border-line py-2 first:border-0">
      <CherryCheck checked={done} onChange={onToggle} label={`Concluir: ${task.title}`} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className={cn("block truncate text-sm font-semibold", done && "text-text-2 line-through")}>{task.title}</span>
        {showProject && task.project && <span className="block truncate text-xs text-text-2">{task.project.name}</span>}
      </button>
      <PriorityText priority={task.priority} />
      {task.dueDate && (
        <span className={cn("inline-flex shrink-0 items-center gap-1 font-mono text-xs", overdue ? "font-bold text-danger" : "text-text-2")}>
          <CalendarDays aria-hidden className="size-3.5" />
          {fmtDue(task.dueDate, today)}
        </span>
      )}
    </li>
  );
}

const COLUMNS: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

/**
 * Kanban (E6-2): arrastar e soltar entre colunas, com alternativa por teclado/menu "Mover para…" (E6-7).
 * Atualização otimista: a tarefa muda de coluna na hora e volta se a API recusar.
 */
export function TaskBoard({ tasks, onMove, onOpen, onToggle }: { tasks: TaskDto[]; onMove: (t: TaskDto, s: TaskStatus, position: number) => void; onOpen: (t: TaskDto) => void; onToggle: (t: TaskDto, done: boolean) => void }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  function drop(e: DragEvent, status: TaskStatus) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === id);
    setOver(null);
    setDragging(null);
    if (!task) return;
    const column = tasks.filter((t) => t.status === status && t.id !== id);
    const last = column.at(-1)?.position ?? 0;
    if (task.status !== status) onMove(task, status, last + 1);
  }

  return (
    <div className="grid auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((status) => {
        const column = tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);
        return (
          <section
            key={status}
            aria-label={`${taskStatusLabel[status]}, ${column.length} tarefas`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(status);
            }}
            onDragLeave={() => setOver((o) => (o === status ? null : o))}
            onDrop={(e) => drop(e, status)}
            className={cn("glass flex min-h-48 flex-col gap-2 rounded-[18px] p-3 transition-colors", over === status && "ring-2 ring-accent-text")}
          >
            <h3 className="label-mono flex items-center gap-2 px-1 py-1">
              {taskStatusLabel[status]}
              <span className="ml-auto font-mono">{column.length}</span>
            </h3>
            {column.map((t) => (
              <article
                key={t.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", t.id);
                  setDragging(t.id);
                }}
                onDragEnd={() => setDragging(null)}
                className={cn("grid gap-2 rounded-xl border border-line bg-field p-3", dragging === t.id && "opacity-50")}
              >
                <div className="flex items-start gap-2">
                  <CherryCheck checked={t.status === "DONE"} onChange={(v) => onToggle(t, v)} label={`Concluir: ${t.title}`} />
                  <button type="button" onClick={() => onOpen(t)} className={cn("min-w-0 flex-1 pt-0.5 text-left text-sm font-semibold", t.status === "DONE" && "text-text-2 line-through")}>
                    {t.title}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-2">
                  {t.project && <span className="truncate">{t.project.name}</span>}
                  <PriorityText priority={t.priority} />
                  {t.dueDate && <span className="ml-auto font-mono">{fmtDue(t.dueDate)}</span>}
                </div>
                <label className="sr-only" htmlFor={`mover-${t.id}`}>
                  Mover “{t.title}” para
                </label>
                <select
                  id={`mover-${t.id}`}
                  value={t.status}
                  onChange={(e) => onMove(t, e.target.value as TaskStatus, (tasks.filter((x) => x.status === e.target.value).at(-1)?.position ?? 0) + 1)}
                  className="h-8 rounded-lg border border-line bg-field px-2 text-xs text-text-2"
                >
                  {COLUMNS.map((s) => (
                    <option key={s} value={s}>
                      Mover para: {taskStatusLabel[s]}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

/** Painel lateral para criar/editar tarefa (E6-4). */
export function TaskSheet({
  open,
  onOpenChange,
  task,
  defaults,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task: TaskDto | null;
  defaults?: { projectId?: string; dueDate?: string; status?: TaskStatus };
  onSaved: () => void | Promise<void>;
}) {
  const { ws } = useSession();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const projects = useList<ProjectDto>(open ? ws("/projects") : null);
  const initial: FormValues = {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? defaults?.status ?? "TODO",
    priority: task?.priority ?? "MEDIUM",
    dueDate: task?.dueDate?.slice(0, 10) ?? defaults?.dueDate ?? "",
    projectId: task?.projectId ?? defaults?.projectId ?? "",
    milestoneId: task?.milestoneId ?? "",
  };
  // Projeto escolhido no formulário (vale só para a tarefa em edição; senão, o da própria tarefa).
  const formKey = task?.id ?? "nova";
  const [picked, setPicked] = useState<{ key: string; projectId: string } | null>(null);
  const projectId = picked?.key === formKey ? picked.projectId : String(initial.projectId);
  const milestones = useList<MilestoneDto>(open && projectId ? ws(`/milestones?projectId=${projectId}`) : null);

  async function save(v: FormValues) {
    const body = clean(v);
    if (!body.projectId) body.milestoneId = null;
    if (task) await api(ws(`/tasks/${task.id}`), { method: "PATCH", body });
    else await api(ws("/tasks"), { method: "POST", body });
    toast(task ? "Tarefa salva" : "Tarefa criada");
    onOpenChange(false);
    await onSaved();
  }

  async function remove() {
    if (!task) return;
    try {
      await api(ws(`/tasks/${task.id}`), { method: "DELETE" });
      toast("Tarefa excluída");
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={task ? "editar tarefa" : "nova tarefa"}>
      {open && (
        <EntityForm
          key={task?.id ?? "nova"}
          initial={initial}
          onChange={(v) => setPicked({ key: formKey, projectId: String(v.projectId ?? "") })}
          fields={[
            { name: "title", label: "Título", required: true, wide: true },
            { name: "status", label: "Status", type: "select", options: TASK_STATUS_OPTS },
            { name: "priority", label: "Prioridade", type: "select", options: PRIORITY_OPTS },
            { name: "dueDate", label: "Vencimento", type: "date" },
            { name: "projectId", label: "Projeto", type: "select", options: [{ value: "", label: "Sem projeto (avulsa)" }, ...projects.items.map((p) => ({ value: p.id, label: p.name }))] },
            ...(projectId && milestones.items.length > 0
              ? [{ name: "milestoneId", label: "Marco", type: "select" as const, options: [{ value: "", label: "Sem marco" }, ...milestones.items.map((m) => ({ value: m.id, label: m.title }))], wide: true }]
              : []),
            { name: "description", label: "Descrição", type: "textarea" },
          ]}
          onSubmit={save}
          onDelete={task ? () => setConfirm(true) : undefined}
        />
      )}
      {open && (
        <p className="text-xs text-text-2">
          Dica: no Kanban, arraste o cartão ou use “Mover para”. {task?.project && <Link className="font-bold text-accent-text underline" href={`/projetos/${task.project.id}`}>Abrir projeto</Link>}
        </p>
      )}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Excluir tarefa?" description="A tarefa será apagada definitivamente." confirmLabel="Excluir" danger onConfirm={() => void remove()} />
    </Sheet>
  );
}
