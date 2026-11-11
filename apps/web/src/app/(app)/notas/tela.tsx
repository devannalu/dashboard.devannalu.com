"use client";

import type { IdeaDto, NoteDto, ProjectDto } from "@studio/contracts";
import { Archive, ArchiveRestore, CheckSquare, FileText, Pin, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoadError, PageHeader, Tabs } from "@/components/app/common";
import { Button, IconButton } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { useQueryParam } from "@/lib/query";
import { useSession } from "@/lib/session";
import { useData, useList } from "@/lib/use-data";

type Tab = "inbox" | "projetos" | "ideias" | "todas" | "arquivadas";
type SaveState = "salvo" | "salvando" | "pendente" | "erro" | "conflito";

const DRAFT_KEY = (id: string) => `nota-rascunho:${id}`;

function readDraft(note: NoteDto): { title: string; content: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(note.id));
    if (!raw) return null;
    const d = JSON.parse(raw) as { title: string; content: string };
    if (d.content === note.content && d.title === note.title) {
      localStorage.removeItem(DRAFT_KEY(note.id));
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

/** Editor de nota com salvamento automático (E9-3) e resolução de conflito de versão (E9-4). */
function NoteEditor({ note, onChanged, onDeleted }: { note: NoteDto; onChanged: (n: NoteDto) => void; onDeleted: () => void }) {
  const { ws } = useSession();
  const toast = useToast();
  // Rascunho local: se um salvamento falhou (ex.: sem internet), o texto volta ao reabrir a nota.
  const [draft] = useState(() => readDraft(note));
  const [title, setTitle] = useState(draft?.title ?? note.title);
  const [content, setContent] = useState(draft?.content ?? note.content);
  const [state, setState] = useState<SaveState>(draft ? "pendente" : "salvo");
  const [confirm, setConfirm] = useState(false);
  const version = useRef(note.version);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const projects = useList<ProjectDto>(ws("/projects"));
  const ideas = useList<IdeaDto>(ws("/ideas"));

  const save = useCallback(
    async (data: Partial<NoteDto> & { archived?: boolean }, force = false) => {
      setState("salvando");
      try {
        const saved = await api<NoteDto>(ws(`/notes/${note.id}`), { method: "PATCH", body: force ? data : { ...data, version: version.current } });
        version.current = saved.version;
        setState("salvo");
        try {
          localStorage.removeItem(DRAFT_KEY(note.id));
        } catch {
          /* ignora */
        }
        onChanged(saved);
      } catch (e) {
        setState(e instanceof ApiError && e.code === "VERSION_CONFLICT" ? "conflito" : "erro");
      }
    },
    [note.id, ws, onChanged],
  );

  function edit(nextTitle: string, nextContent: string) {
    setTitle(nextTitle);
    setContent(nextContent);
    setState("pendente");
    try {
      localStorage.setItem(DRAFT_KEY(note.id), JSON.stringify({ title: nextTitle, content: nextContent }));
    } catch {
      /* ignora */
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save({ title: nextTitle, content: nextContent }), 800);
  }

  // Salva antes de trocar de nota ou sair da página.
  useEffect(() => {
    const flush = (e: BeforeUnloadEvent) => {
      if (timer.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function reloadServer() {
    const fresh = await api<NoteDto>(ws(`/notes/${note.id}`));
    version.current = fresh.version;
    setTitle(fresh.title);
    setContent(fresh.content);
    setState("salvo");
    onChanged(fresh);
  }

  async function toTask() {
    try {
      await api(ws("/tasks"), { method: "POST", body: { title: (title || content.split("\n")[0] || "Tarefa da nota").slice(0, 300), description: content || null, projectId: note.projectId } });
      toast("Tarefa criada a partir da nota");
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await api(ws(`/notes/${note.id}`), { method: "DELETE" });
      localStorage.removeItem(DRAFT_KEY(note.id));
      toast("Nota excluída");
      onDeleted();
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  const label: Record<SaveState, string> = { salvo: "Salvo", salvando: "Salvando…", pendente: "Alterações não salvas", erro: "Não foi possível salvar — tentaremos de novo ao editar", conflito: "Esta nota mudou em outra aba" };

  return (
    <Card className="grid content-start gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span role="status" className={cn("label-mono", state === "erro" || state === "conflito" ? "text-danger" : state === "salvo" ? "text-success" : "")}>
          {label[state]}
        </span>
        <div className="ml-auto flex gap-1">
          <IconButton variant="ghost" label={note.pinned ? "Desafixar" : "Fixar no topo"} aria-pressed={note.pinned} onClick={() => void save({ pinned: !note.pinned })}>
            <Pin aria-hidden className={cn(note.pinned && "fill-current text-accent-text")} />
          </IconButton>
          <IconButton variant="ghost" label="Criar tarefa a partir da nota" onClick={() => void toTask()}>
            <CheckSquare aria-hidden />
          </IconButton>
          <IconButton variant="ghost" label={note.archivedAt ? "Desarquivar" : "Arquivar"} onClick={() => void save({ archived: !note.archivedAt })}>
            {note.archivedAt ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          </IconButton>
          <IconButton variant="ghost" label="Excluir nota" onClick={() => setConfirm(true)}>
            <Trash2 aria-hidden />
          </IconButton>
        </div>
      </div>
      {state === "conflito" && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-danger p-3 text-sm">
          <span className="flex-1 font-semibold">Outra aba salvou esta nota depois de você abrir. Qual versão manter?</span>
          <Button size="sm" variant="secondary" onClick={() => void reloadServer()}>
            Usar a do servidor
          </Button>
          <Button size="sm" onClick={() => void save({ title, content }, true)}>
            Manter a minha
          </Button>
        </div>
      )}
      <input
        aria-label="Título da nota"
        value={title}
        placeholder="Título"
        onChange={(e) => edit(e.target.value, content)}
        className="bg-transparent font-display text-3xl font-black tracking-tight outline-none placeholder:text-text-2"
      />
      <textarea
        aria-label="Conteúdo da nota"
        value={content}
        placeholder="Escreva aqui…"
        onChange={(e) => edit(title, e.target.value)}
        className="min-h-[50vh] w-full resize-y rounded-xl border border-line bg-field p-4 text-sm leading-relaxed outline-none focus-visible:border-accent-text"
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Select aria-label="Projeto da nota" value={note.projectId ?? ""} onChange={(e) => void save({ projectId: e.target.value || null })}>
          <option value="">Sem projeto</option>
          {projects.items.map((p) => (
            <option key={p.id} value={p.id}>
              Projeto: {p.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Ideia da nota" value={note.ideaId ?? ""} onChange={(e) => void save({ ideaId: e.target.value || null })}>
          <option value="">Sem ideia</option>
          {ideas.items
            .filter((i) => i.status !== "CONVERTED" || i.id === note.ideaId)
            .map((i) => (
              <option key={i.id} value={i.id}>
                Ideia: {i.title}
              </option>
            ))}
        </Select>
      </div>
      <p className="font-mono text-[11px] text-text-2">
        Criada em {fmtDateTime(note.createdAt)} · editada em {fmtDateTime(note.updatedAt)}
      </p>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Excluir nota?" description="A nota será apagada definitivamente." confirmLabel="Excluir" danger onConfirm={() => void remove()} />
    </Card>
  );
}

export default function Notas() {
  const { ws } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("todas");
  const [q, setQ] = useState("");
  const abrir = useQueryParam("abrir");
  const [selectedState, setSelected] = useState<string | null | undefined>(undefined);
  const selected = selectedState === undefined ? abrir : selectedState;
  const path = tab === "arquivadas" ? "/notes?archived=true" : tab === "inbox" ? "/notes?inbox=true" : "/notes";
  const notes = useList<NoteDto>(ws(`${path}${q ? `${path.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`));
  const shown = notes.items.filter((n) => (tab === "projetos" ? !!n.projectId : tab === "ideias" ? !!n.ideaId : true));
  const current = notes.items.find((n) => n.id === selected) ?? null;

  // Nota aberta pela URL pode não estar na aba atual (ex.: arquivada): busca direto.
  const inList = notes.items.some((n) => n.id === selected);
  const direct = useData<NoteDto>(selected && !notes.loading && !inList ? ws(`/notes/${selected}`) : null);
  const editing = current ?? (direct.data?.id === selected ? direct.data : null);

  async function create() {
    try {
      const n = await api<NoteDto>(ws("/notes"), { method: "POST", body: { title: "", content: "" } });
      if (tab === "arquivadas") setTab("todas");
      await notes.reload();
      setSelected(n.id);
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  const onChanged = useCallback(
    (n: NoteDto) => notes.setData((prev) => prev && { data: prev.data.map((x) => (x.id === n.id ? n : x)) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <>
      <PageHeader
        title="suas"
        script="notas"
        description="Inbox para o que chegou agora; vincule a projetos e ideias quando fizer sentido."
        actions={
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => void create()}>
            Nova nota
          </Button>
        }
      />
      <Tabs<Tab>
        label="Filtro de notas"
        value={tab}
        onChange={(v) => {
          setTab(v);
        }}
        items={[
          { value: "todas", label: "Todas" },
          { value: "inbox", label: "Inbox" },
          { value: "projetos", label: "De projetos" },
          { value: "ideias", label: "De ideias" },
          { value: "arquivadas", label: "Arquivadas" },
        ]}
      />
      {notes.error && <LoadError message={notes.error} onRetry={notes.reload} />}
      <div className="grid gap-5 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <Card className="grid content-start gap-3 p-3 sm:p-4">
          <Input type="search" aria-label="Buscar nas notas" placeholder="Buscar no título e no texto…" value={q} onChange={(e) => setQ(e.target.value)} />
          {notes.loading && !notes.data ? (
            <Skeleton className="h-40" />
          ) : shown.length === 0 ? (
            <p className="p-2 text-sm text-text-2">{q ? "Nenhuma nota encontrada." : "Nenhuma nota aqui."}</p>
          ) : (
            <ul className="grid max-h-[65vh] gap-1 overflow-y-auto" aria-label="Notas">
              {shown.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(n.id)}
                    aria-current={selected === n.id || undefined}
                    className={cn("grid w-full gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-accent-soft", selected === n.id && "bg-accent-soft")}
                  >
                    <span className="flex items-center gap-1.5">
                      {n.pinned && <Pin aria-label="Fixada" className="size-3 shrink-0 fill-current text-accent-text" />}
                      <b className="truncate text-sm">{n.title || "Nota sem título"}</b>
                    </span>
                    <span className="truncate text-xs text-text-2">{n.content.split("\n")[0] || "—"}</span>
                    <span className="truncate font-mono text-[10px] text-text-2">
                      {fmtDateTime(n.updatedAt)}
                      {n.project ? ` · ${n.project.name}` : n.idea ? ` · ideia: ${n.idea.title}` : " · inbox"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {editing ? (
          <NoteEditor key={editing.id} note={editing} onChanged={onChanged} onDeleted={() => { setSelected(null); void notes.reload(); }} />
        ) : (
          <Card>
            <EmptyState icon={<FileText aria-hidden />} title="escolha uma nota" description="Selecione uma nota na lista ou crie uma nova. Tudo é salvo automaticamente." action={<Button onClick={() => void create()}>Nova nota</Button>} />
          </Card>
        )}
      </div>
    </>
  );
}
