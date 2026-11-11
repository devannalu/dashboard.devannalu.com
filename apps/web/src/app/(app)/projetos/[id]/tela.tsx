"use client";

import { priorityLabel, projectCategoryLabel, type MilestoneDto, type NoteDto, type ProjectDto, type TaskDto } from "@studio/contracts";
import { ArrowLeft, ExternalLink, Flag, GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CherryCheck, LoadError, ProjectStatusBadge, Tabs } from "@/components/app/common";
import { clean, EntityForm } from "@/components/app/entity-form";
import { FilesPanel } from "@/components/app/files-panel";
import { GithubTags } from "@/components/app/github-import";
import { ProjectSheet } from "@/components/app/project-sheet";
import { TaskBoard, TaskRow, TaskSheet, useTaskActions } from "@/components/app/tasks";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader, EmptyState, Progress, Skeleton } from "@/components/ui/display";
import { ConfirmDialog, Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDate, fmtDateTime, todayYmd } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useData, useList } from "@/lib/use-data";

type Tab = "geral" | "tarefas" | "marcos" | "notas" | "arquivos";

export default function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { ws } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("geral");
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [editingProject, setEditingProject] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [task, setTask] = useState<TaskDto | null>(null);
  const [newTask, setNewTask] = useState(false);
  const [milestoneSheet, setMilestoneSheet] = useState<MilestoneDto | "novo" | null>(null);

  const project = useData<ProjectDto>(ws(`/projects/${id}`));
  const tasks = useList<TaskDto>(ws(`/tasks?projectId=${id}`));
  const milestones = useList<MilestoneDto>(ws(`/milestones?projectId=${id}`));
  const notes = useList<NoteDto>(ws(`/notes?projectId=${id}`));
  const refreshAll = async () => {
    await Promise.all([tasks.reload(), project.reload(), milestones.reload()]);
  };
  const actions = useTaskActions(refreshAll);
  const p = project.data;

  if (project.error) {
    return (
      <>
        <Link href="/projetos" className="glass inline-flex items-center gap-1 justify-self-start rounded-xl px-3 py-1.5 text-sm font-bold text-accent-text">
          <ArrowLeft aria-hidden className="size-4" /> Projetos
        </Link>
        <LoadError message={project.error} onRetry={project.reload} />
      </>
    );
  }
  if (!p) return <Skeleton className="h-64" />;

  async function deleteProject() {
    try {
      await api(ws(`/projects/${id}`), { method: "DELETE" });
      toast("Projeto excluído");
      router.replace("/projetos");
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  async function toggleMilestone(m: MilestoneDto, done: boolean) {
    try {
      await api(ws(`/milestones/${m.id}`), { method: "PATCH", body: { completed: done } });
      await milestones.reload();
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  async function newNote() {
    const note = await api<NoteDto>(ws("/notes"), { method: "POST", body: { title: "Nova nota", content: "", projectId: id } });
    router.push(`/notas?abrir=${note.id}`);
  }

  const today = todayYmd();
  const openMilestones = milestones.items.filter((m) => !m.completedAt);

  return (
    <>
      <Link href="/projetos" className="glass inline-flex items-center gap-1 justify-self-start rounded-xl px-3 py-1.5 text-sm font-bold text-accent-text">
        <ArrowLeft aria-hidden className="size-4" /> Projetos
      </Link>

      <div className="glass flex flex-wrap items-start gap-4 rounded-[22px] p-5 sm:p-6">
        <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-2xl bg-accent font-display text-3xl font-black text-white">
          {p.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-4xl leading-none font-black tracking-tighter lowercase sm:text-5xl">{p.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-2">
            <span>{projectCategoryLabel[p.category]}</span>
            <ProjectStatusBadge status={p.status} />
            {p.client && <Link href={`/clientes?abrir=${p.client.id}`} className="underline">{p.client.name}</Link>}
            {p.dueDate && <span className="font-mono">entrega {fmtDate(p.dueDate)}</span>}
          </p>
          {p.githubUrl && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs font-bold text-accent-text hover:underline">
                <GitBranch aria-hidden className="size-3.5" /> {p.githubFullName} <ExternalLink aria-hidden className="size-3" />
              </a>
              <GithubTags org={p.githubOrg} archived={p.githubArchived} />
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<Pencil aria-hidden className="size-4" />} onClick={() => setEditingProject(true)}>
            Editar
          </Button>
          <IconButton label="Excluir projeto" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden />
          </IconButton>
        </div>
      </div>

      <Tabs<Tab>
        label="Seções do projeto"
        value={tab}
        onChange={setTab}
        items={[
          { value: "geral", label: "Visão geral" },
          { value: "tarefas", label: "Tarefas", count: tasks.items.length },
          { value: "marcos", label: "Marcos", count: milestones.items.length },
          { value: "notas", label: "Notas", count: notes.items.length },
          { value: "arquivos", label: "Arquivos" },
        ]}
      />

      {tab === "geral" && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader title="Sobre" />
            {p.description ? <p className="whitespace-pre-wrap text-sm">{p.description}</p> : <p className="text-sm text-text-2">Sem descrição. Use “Editar” para contar o objetivo do projeto.</p>}
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="label-mono">Prioridade</dt><dd className="mt-1">{priorityLabel[p.priority]}</dd></div>
              <div><dt className="label-mono">Início</dt><dd className="mt-1">{p.startDate ? fmtDate(p.startDate) : "—"}</dd></div>
              <div><dt className="label-mono">Entrega</dt><dd className="mt-1">{p.dueDate ? fmtDate(p.dueDate) : "—"}</dd></div>
              <div><dt className="label-mono">Criado em</dt><dd className="mt-1">{fmtDateTime(p.createdAt)}</dd></div>
            </dl>
          </Card>
          <div className="grid content-start gap-5">
            <Card>
              <CardHeader title="Progresso" />
              <Progress value={p.progress?.percent ?? null} label="Progresso do projeto" />
              <p className="mt-2 text-xs text-text-2">
                {p.progress && p.progress.total > 0 ? `${p.progress.done} de ${p.progress.total} tarefas concluídas.` : "Crie tarefas para acompanhar o progresso."}
              </p>
            </Card>
            <Card>
              <CardHeader title="Próximos marcos" action={<button type="button" onClick={() => setTab("marcos")}>Ver todos</button>} />
              {openMilestones.length === 0 ? (
                <p className="text-sm text-text-2">Nenhum marco em aberto.</p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {openMilestones.slice(0, 4).map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <Flag aria-hidden className={cn("size-4", m.isDelivery ? "text-accent-text" : "text-text-2")} />
                      <span className="flex-1 truncate">{m.title}</span>
                      {m.dueDate && <span className={cn("font-mono text-xs", m.dueDate.slice(0, 10) < today ? "font-bold text-danger" : "text-text-2")}>{fmtDate(m.dueDate)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === "tarefas" && (
        <>
          <div className="glass flex flex-wrap items-center gap-2 rounded-2xl p-2">
            <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setNewTask(true)}>
              Nova tarefa
            </Button>
            <div role="group" aria-label="Visualização" className="ml-auto flex rounded-xl border border-line bg-field p-1">
              {(["kanban", "lista"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold capitalize", view === v && "bg-accent text-white")}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {tasks.error && <LoadError message={tasks.error} onRetry={tasks.reload} />}
          {tasks.items.length === 0 && !tasks.loading ? (
            <Card>
              <EmptyState title="sem tarefas" description="Quebre o projeto em passos pequenos. O progresso é calculado a partir delas." action={<Button onClick={() => setNewTask(true)}>Criar tarefa</Button>} />
            </Card>
          ) : view === "kanban" ? (
            <TaskBoard
              tasks={tasks.items}
              onOpen={setTask}
              onToggle={(t, v) => void actions.toggle(t, v)}
              onMove={(t, status, position) => {
                tasks.setData((prev) => prev && { data: prev.data.map((x) => (x.id === t.id ? { ...x, status, position } : x)) });
                void actions.move(t, status, position);
              }}
            />
          ) : (
            <Card>
              <ul>
                {tasks.items.map((t) => (
                  <TaskRow key={t.id} task={t} showProject={false} onToggle={(v) => void actions.toggle(t, v)} onOpen={() => setTask(t)} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {tab === "marcos" && (
        <Card>
          <CardHeader title="Linha do tempo" action={<button type="button" onClick={() => setMilestoneSheet("novo")}>+ Novo marco</button>} />
          {milestones.items.length === 0 ? (
            <EmptyState title="sem marcos" description="Marcos são etapas importantes. Marque como “Entrega” os que vão para o cliente." action={<Button onClick={() => setMilestoneSheet("novo")}>Criar marco</Button>} />
          ) : (
            <ol className="grid gap-1 border-l-2 border-line pl-4">
              {milestones.items.map((m) => {
                const linked = tasks.items.filter((t) => t.milestoneId === m.id);
                const allDone = linked.length > 0 && linked.every((t) => t.status === "DONE");
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
                    <CherryCheck checked={!!m.completedAt} onChange={(v) => void toggleMilestone(m, v)} label={`Concluir marco: ${m.title}`} />
                    <button type="button" onClick={() => setMilestoneSheet(m)} className={cn("min-w-0 flex-1 text-left font-semibold", m.completedAt && "text-text-2 line-through")}>
                      {m.isDelivery && <span className="label-mono mr-2 text-accent-text">Entrega</span>}
                      {m.title}
                      {linked.length > 0 && <span className="ml-2 font-mono text-xs font-normal text-text-2">{linked.filter((t) => t.status === "DONE").length}/{linked.length} tarefas</span>}
                    </button>
                    {allDone && !m.completedAt && <span className="text-xs font-bold text-success">Todas as tarefas concluídas — concluir o marco?</span>}
                    {m.dueDate && <span className={cn("font-mono text-xs", !m.completedAt && m.dueDate.slice(0, 10) < today ? "font-bold text-danger" : "text-text-2")}>{fmtDate(m.dueDate)}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      )}

      {tab === "notas" && (
        <Card>
          <CardHeader title="Notas do projeto" action={<button type="button" onClick={() => void newNote()}>+ Nova nota</button>} />
          {notes.items.length === 0 ? (
            <EmptyState title="sem notas" description="Reuniões, decisões, referências: anote tudo aqui." action={<Button onClick={() => void newNote()}>Escrever nota</Button>} />
          ) : (
            <ul className="grid gap-2">
              {notes.items.map((n) => (
                <li key={n.id} className="border-t border-line pt-2 first:border-0 first:pt-0">
                  <Link href={`/notas?abrir=${n.id}`} className="block hover:text-accent-text">
                    <b className="block text-sm">{n.title || "Nota sem título"}</b>
                    <span className="line-clamp-2 text-xs text-text-2">{n.content || "—"}</span>
                    <span className="font-mono text-[11px] text-text-2">{fmtDateTime(n.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === "arquivos" && (
        <Card>
          <FilesPanel projectId={id} />
        </Card>
      )}

      <ProjectSheet open={editingProject} onOpenChange={setEditingProject} project={p} onSaved={() => project.reload()} />
      <TaskSheet open={task !== null || newTask} onOpenChange={(v) => { if (!v) { setTask(null); setNewTask(false); } }} task={task} defaults={{ projectId: id }} onSaved={refreshAll} />
      <MilestoneSheet value={milestoneSheet} projectId={id} onClose={() => setMilestoneSheet(null)} onSaved={milestones.reload} />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir projeto?"
        description="O projeto, suas tarefas e marcos serão apagados definitivamente. Notas, eventos e arquivos ficam, sem vínculo."
        confirmLabel="Excluir projeto"
        danger
        onConfirm={() => void deleteProject()}
      />
    </>
  );
}

function MilestoneSheet({ value, projectId, onClose, onSaved }: { value: MilestoneDto | "novo" | null; projectId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const { ws } = useSession();
  const toast = useToast();
  const m = value === "novo" ? null : value;
  return (
    <Sheet open={value !== null} onOpenChange={(v) => !v && onClose()} title={m ? "editar marco" : "novo marco"}>
      {value !== null && (
        <EntityForm
          key={m?.id ?? "novo"}
          initial={{ title: m?.title ?? "", dueDate: m?.dueDate?.slice(0, 10) ?? "", isDelivery: m?.isDelivery ?? false }}
          fields={[
            { name: "title", label: "Título", required: true, wide: true },
            { name: "dueDate", label: "Data-alvo", type: "date" },
            { name: "isDelivery", label: "É uma entrega (conta no relatório de entregas no prazo)", type: "checkbox" },
          ]}
          onSubmit={async (v) => {
            const body = clean(v);
            if (m) await api(ws(`/milestones/${m.id}`), { method: "PATCH", body });
            else await api(ws("/milestones"), { method: "POST", body: { ...body, projectId } });
            toast(m ? "Marco salvo" : "Marco criado");
            onClose();
            await onSaved();
          }}
          onDelete={
            m
              ? async () => {
                  await api(ws(`/milestones/${m.id}`), { method: "DELETE" }).catch((e: unknown) => toast(errorMessage(e)));
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
