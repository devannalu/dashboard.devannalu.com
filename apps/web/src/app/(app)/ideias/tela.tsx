"use client";

import { ideaStatusLabel, type IdeaDto, type IdeaStatus, type NoteDto } from "@studio/contracts";
import { Lightbulb, Plus, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadError, PageHeader, PROJECT_CATEGORY_OPTS } from "@/components/app/common";
import { clean, EntityForm } from "@/components/app/entity-form";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Field, Select } from "@/components/ui/field";
import { ConfirmDialog, Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fmtDateTime } from "@/lib/format";
import { useUrlSelection } from "@/lib/query";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";

const COLUMNS: IdeaStatus[] = ["NEW", "EXPLORING", "VALIDATED"];
const EDITABLE_STATUS = (["NEW", "EXPLORING", "VALIDATED", "DISCARDED"] as const).map((s) => ({ value: s, label: ideaStatusLabel[s] }));
const TONE: Record<IdeaStatus, "neutral" | "info" | "success" | "warn" | "accent"> = { NEW: "info", EXPLORING: "accent", VALIDATED: "success", DISCARDED: "neutral", CONVERTED: "success" };

/** Idea Lab (E10): ideias ainda não estruturadas; a validada vira projeto com um clique. */
export default function Ideias() {
  const { ws } = useSession();
  const [showClosed, setShowClosed] = useState(false);
  const ideas = useList<IdeaDto>(ws("/ideas"));
  const [open, setOpen] = useUrlSelection<IdeaDto, "nova">(ideas.items);

  const closed = ideas.items.filter((i) => i.status === "DISCARDED" || i.status === "CONVERTED");

  return (
    <>
      <PageHeader
        title="idea"
        script="lab"
        description="Guarde ideias soltas, explore, valide — e transforme em projeto quando estiverem prontas."
        actions={
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setOpen("nova")}>
            Nova ideia
          </Button>
        }
      />
      {ideas.error && <LoadError message={ideas.error} onRetry={ideas.reload} />}
      {ideas.loading && !ideas.data ? (
        <Skeleton className="h-48" />
      ) : ideas.items.length === 0 ? (
        <Card>
          <EmptyState icon={<Lightbulb aria-hidden />} title="mural vazio" description="Toda ideia começa com um título. O resto vem depois." action={<Button onClick={() => setOpen("nova")}>Guardar primeira ideia</Button>} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((status) => {
            const list = ideas.items.filter((i) => i.status === status);
            return (
              <section key={status} aria-label={ideaStatusLabel[status]} className="glass grid content-start gap-3 rounded-[22px] p-4">
                <h2 className="label-mono flex">
                  {ideaStatusLabel[status]}
                  <span className="ml-auto font-mono">{list.length}</span>
                </h2>
                {list.length === 0 && <p className="text-sm text-text-2">—</p>}
                {list.map((i) => (
                  <button key={i.id} type="button" onClick={() => setOpen(i)} className="grid gap-1 rounded-xl border border-line bg-field p-3 text-left hover:border-accent-text">
                    <b className="text-sm">{i.title}</b>
                    {i.description && <span className="line-clamp-3 text-xs text-text-2">{i.description}</span>}
                    <span className="font-mono text-[10px] text-text-2">
                      {fmtDateTime(i.updatedAt)}
                      {i._count?.notes ? ` · ${i._count.notes} nota(s)` : ""}
                    </span>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      )}
      {closed.length > 0 && (
        <Card>
          <button type="button" className="label-mono" aria-expanded={showClosed} onClick={() => setShowClosed((v) => !v)}>
            {showClosed ? "▾" : "▸"} Descartadas e convertidas · {closed.length}
          </button>
          {showClosed && (
            <ul className="mt-3 grid gap-2">
              {closed.map((i) => (
                <li key={i.id} className="flex items-center gap-3">
                  <button type="button" className="min-w-0 flex-1 truncate text-left text-sm font-semibold" onClick={() => setOpen(i)}>
                    {i.title}
                  </button>
                  <Badge tone={TONE[i.status]}>{ideaStatusLabel[i.status]}</Badge>
                  {i.convertedProjectId && (
                    <Link href={`/projetos/${i.convertedProjectId}`} className="text-xs font-bold text-accent-text underline">
                      Ver projeto
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      <IdeaSheet value={open} onClose={() => setOpen(null)} onSaved={ideas.reload} />
    </>
  );
}

function IdeaSheet({ value, onClose, onSaved }: { value: IdeaDto | "nova" | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { ws } = useSession();
  const toast = useToast();
  const router = useRouter();
  const idea = value === "nova" ? null : value;
  const notes = useList<NoteDto>(idea ? ws(`/notes?ideaId=${idea.id}`) : null);
  const [category, setCategory] = useState("OWNED_PRODUCT");
  const [converting, setConverting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const readOnly = idea?.status === "CONVERTED";

  async function convert() {
    if (!idea) return;
    setConverting(true);
    try {
      const { projectId } = await api<{ projectId: string }>(ws(`/ideas/${idea.id}/convert`), { method: "POST", body: { category } });
      toast("Ideia virou projeto 🍒");
      router.push(`/projetos/${projectId}`);
    } catch (e) {
      toast(errorMessage(e));
      setConverting(false);
    }
  }

  async function addNote() {
    if (!idea) return;
    const n = await api<NoteDto>(ws("/notes"), { method: "POST", body: { title: `Sobre: ${idea.title}`.slice(0, 200), content: "", ideaId: idea.id } });
    router.push(`/notas?abrir=${n.id}`);
  }

  return (
    <Sheet open={value !== null} onOpenChange={(v) => !v && onClose()} title={idea ? "ideia" : "nova ideia"} description={readOnly ? "Esta ideia virou projeto e agora é somente leitura." : undefined}>
      {value !== null && !readOnly && (
        <EntityForm
          key={idea?.id ?? "nova"}
          initial={{ title: idea?.title ?? "", status: idea?.status ?? "NEW", description: idea?.description ?? "" }}
          fields={[
            { name: "title", label: "Título", required: true, wide: true },
            ...(idea ? [{ name: "status", label: "Status", type: "select" as const, options: EDITABLE_STATUS, wide: true }] : []),
            { name: "description", label: "Descrição, problema, público, referências…", type: "textarea" },
          ]}
          onSubmit={async (v) => {
            const body = clean(v);
            if (idea) await api(ws(`/ideas/${idea.id}`), { method: "PATCH", body });
            else await api(ws("/ideas"), { method: "POST", body: { title: body.title, description: body.description } });
            toast(idea ? "Ideia salva" : "Ideia guardada");
            onClose();
            await onSaved();
          }}
          onDelete={idea ? () => setConfirmDelete(true) : undefined}
        />
      )}
      {readOnly && idea && (
        <div className="grid gap-2">
          <h3 className="text-xl font-black">{idea.title}</h3>
          {idea.description && <p className="whitespace-pre-wrap text-sm">{idea.description}</p>}
          {idea.convertedProjectId && (
            <Link href={`/projetos/${idea.convertedProjectId}`} className="font-bold text-accent-text underline">
              Abrir o projeto
            </Link>
          )}
        </div>
      )}
      {idea && (
        <div className="grid gap-2 border-t border-line pt-4">
          <p className="label-mono">Notas da ideia</p>
          {notes.items.length === 0 ? <p className="text-sm text-text-2">Nenhuma nota.</p> : (
            <ul className="grid gap-1">
              {notes.items.map((n) => (
                <li key={n.id}>
                  <Link className="text-sm font-semibold hover:text-accent-text" href={`/notas?abrir=${n.id}`}>
                    {n.title || "Nota sem título"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!readOnly && (
            <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => void addNote()}>
              Escrever nota sobre a ideia
            </Button>
          )}
        </div>
      )}
      {idea && !readOnly && (
        <div className={cn("grid gap-3 rounded-xl border border-line p-4")}>
          <p className="label-mono">Transformar em projeto</p>
          <p className="text-xs text-text-2">Cria um projeto em Planejamento com a descrição da ideia e leva as notas junto. A ideia fica somente leitura.</p>
          <Field label="Categoria do projeto">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {PROJECT_CATEGORY_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Button icon={<Rocket aria-hidden className="size-4" />} loading={converting} onClick={() => void convert()}>
            Virar projeto
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir ideia?"
        description="A ideia será apagada. Notas vinculadas continuam existindo, sem vínculo."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (!idea) return;
          await api(ws(`/ideas/${idea.id}`), { method: "DELETE" }).catch((e: unknown) => toast(errorMessage(e)));
          onClose();
          await onSaved();
        }}
      />
    </Sheet>
  );
}
