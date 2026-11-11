"use client";

import { projectCategoryLabel, type ClientDto, type GithubRepoDto, type GithubReposDto, type ProjectCategory } from "@studio/contracts";
import { Archive, Building2, ExternalLink, Lock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useData, useList } from "@/lib/use-data";
import { Button, IconButton } from "../ui/button";
import { Skeleton } from "../ui/display";
import { Input, Select } from "../ui/field";
import { Sheet } from "../ui/overlay";
import { useToast } from "../ui/toast";
import { CherryCheck, LoadError, PROJECT_CATEGORY_OPTS } from "./common";

/** Etiquetas do vínculo com o GitHub (organização e arquivado), usadas nos cards e no projeto. */
export function GithubTags({ org, archived }: { org: string | null; archived: boolean }) {
  return (
    <>
      {org && (
        <span className="inline-flex h-6 items-center gap-1 rounded-md bg-accent-soft px-2 text-xs font-semibold text-accent-text">
          <Building2 aria-hidden className="size-3" /> org: {org}
        </span>
      )}
      {archived && (
        <span className="inline-flex h-6 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold text-text-2">
          <Archive aria-hidden className="size-3" /> arquivado no GitHub
        </span>
      )}
    </>
  );
}

type Pick = { category: ProjectCategory; clientId: string };
type Filter = "todos" | "meus" | "orgs";

/**
 * Importar repositórios do GitHub como projetos (D-39). Repositórios de organização entram sempre como
 * "Trabalho profissional"; arquivados no GitHub entram com a etiqueta e status Arquivado.
 * O progresso continua vindo só das tarefas (commits nunca contam).
 */
export function GithubImportSheet({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (v: boolean) => void; onImported: () => void }) {
  const { ws } = useSession();
  const toast = useToast();
  const [fresh, setFresh] = useState(0);
  const repos = useData<GithubReposDto>(open ? ws(`/github/repos${fresh ? `?fresh=1&n=${fresh}` : ""}`) : null);
  const clients = useList<ClientDto>(open ? ws("/clients") : null);
  const [picked, setPicked] = useState<Record<string, Pick>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [showArchived, setShowArchived] = useState(false);
  const [saving, setSaving] = useState(false);

  const all = repos.data?.data ?? [];
  const hasOrgs = all.some((r) => r.org);
  const visible = all.filter(
    (r) =>
      (showArchived || !r.archived || picked[r.id]) &&
      (filter === "todos" || (filter === "meus" ? !r.org : !!r.org)) &&
      (!q || r.name.toLowerCase().includes(q.toLowerCase())),
  );
  const archivedCount = all.filter((r) => r.archived && !r.projectId).length;
  const selected = Object.keys(picked);

  function toggle(r: GithubRepoDto, on: boolean) {
    setPicked((p) => {
      const next = { ...p };
      if (on) next[r.id] = { category: r.org ? "PROFESSIONAL_WORK" : "PERSONAL", clientId: "" };
      else delete next[r.id];
      return next;
    });
  }
  const setPick = (id: string, v: Partial<Pick>) => setPicked((p) => ({ ...p, [id]: { ...p[id]!, ...v } }));
  const needsClient = selected.some((id) => picked[id]!.category === "CLIENT" && !picked[id]!.clientId);

  async function submit() {
    setSaving(true);
    try {
      const items = selected.map((id) => ({ repoId: id, category: picked[id]!.category, clientId: picked[id]!.category === "CLIENT" ? picked[id]!.clientId || null : null }));
      const r = await api<{ created: number; skipped: number }>(ws("/github/import"), { method: "POST", body: { items } });
      toast(r.created === 1 ? "1 projeto importado" : `${r.created} projetos importados${r.skipped ? ` (${r.skipped} já existiam)` : ""}`);
      setPicked({});
      onOpenChange(false);
      onImported();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="importar do GitHub" description="Escolha os repositórios que viram projeto. O progresso continua vindo só das tarefas.">
      {repos.error && <LoadError message={repos.error} onRetry={repos.reload} />}
      {!repos.data && !repos.error && <Skeleton className="h-64" />}
      {repos.data && !repos.data.configured && (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-text-2">
          O GitHub ainda não está conectado. Coloque o token na variável <code className="font-mono">GITHUB_TOKEN</code> do servidor (Coolify) e reinicie a API.
        </p>
      )}
      {repos.data?.configured && (
        <>
          {(repos.data.failedOrgs?.length ?? 0) > 0 && (
            <p role="alert" className="rounded-xl border border-warn px-3 py-2 text-sm text-warn">
              Não consegui ler os repositórios de: {repos.data.failedOrgs!.join(", ")}. Confira o token dessa organização.
            </p>
          )}
          <div className="grid gap-2">
            <div className="flex gap-2">
              <Input type="search" aria-label="Buscar repositório" placeholder="Buscar repositório…" value={q} onChange={(e) => setQ(e.target.value)} />
              <IconButton variant="secondary" label="Atualizar lista do GitHub" onClick={() => setFresh((n) => n + 1)}>
                <RefreshCw aria-hidden />
              </IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {hasOrgs && (
                <Select aria-label="Mostrar" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="max-w-48">
                  <option value="todos">Todos</option>
                  <option value="meus">Só meus</option>
                  <option value="orgs">Só organizações</option>
                </Select>
              )}
              <label className="flex items-center gap-2">
                <CherryCheck checked={showArchived} onChange={setShowArchived} label="Mostrar arquivados no GitHub" />
                <span>Mostrar arquivados ({archivedCount})</span>
              </label>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-text-2">Nenhum repositório com esses filtros.</p>
          ) : (
            <ul className="grid gap-2">
              {visible.map((r) => {
                const pick = picked[r.id];
                return (
                  <li key={r.id} className="grid gap-2 rounded-xl border border-line p-3">
                    <div className="flex items-start gap-3">
                      {r.projectId ? (
                        <span aria-hidden className="mt-0.5 font-bold text-success">✓</span>
                      ) : (
                        <CherryCheck checked={!!pick} onChange={(v) => toggle(r, v)} label={`Importar ${r.name}`} />
                      )}
                      <div className="grid min-w-0 flex-1 gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <b className="truncate">{r.name}</b>
                          <GithubTags org={r.org} archived={r.archived} />
                        </div>
                        <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-2">
                          {r.private ? (
                            <span className="inline-flex items-center gap-1">
                              <Lock aria-hidden className="size-3" /> privado
                            </span>
                          ) : (
                            "público"
                          )}
                          {r.pushedAt && <span>· atualizado {fmtDate(r.pushedAt.slice(0, 10))}</span>}
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-accent-text">
                            · abrir no GitHub <ExternalLink aria-hidden className="size-3" />
                          </a>
                        </p>
                        {r.description && <p className="line-clamp-2 text-xs text-text-2">{r.description}</p>}
                        {r.projectId && (
                          <Link href={`/projetos/${r.projectId}`} className="text-xs font-bold text-accent-text hover:underline">
                            já importado → abrir projeto
                          </Link>
                        )}
                      </div>
                    </div>
                    {pick && (
                      <div className="grid gap-2 pl-8 sm:grid-cols-2">
                        {r.org ? (
                          <p className="text-xs text-text-2 sm:col-span-2">
                            Categoria: <b>{projectCategoryLabel.PROFESSIONAL_WORK}</b> (repositório de organização)
                          </p>
                        ) : (
                          <Select aria-label={`Categoria de ${r.name}`} value={pick.category} onChange={(e) => setPick(r.id, { category: e.target.value as ProjectCategory })}>
                            {PROJECT_CATEGORY_OPTS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </Select>
                        )}
                        {!r.org && pick.category === "CLIENT" && (
                          <Select aria-label={`Cliente de ${r.name}`} value={pick.clientId} onChange={(e) => setPick(r.id, { clientId: e.target.value })}>
                            <option value="">Escolha o cliente</option>
                            {clients.items.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.company ? `${c.name} · ${c.company}` : c.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="sticky bottom-0 -mx-6 -mb-6 mt-auto flex items-center gap-3 border-t border-line bg-glass-strong px-6 py-4">
            <span className="text-sm text-text-2">
              {selected.length === 0 ? "Nenhum selecionado" : `${selected.length} selecionado${selected.length === 1 ? "" : "s"}`}
              {needsClient && <span className="block text-xs text-danger">Escolha o cliente dos projetos de cliente.</span>}
            </span>
            <Button className="ml-auto" disabled={selected.length === 0 || needsClient} loading={saving} onClick={() => void submit()}>
              {selected.length > 1 ? `Importar ${selected.length} projetos` : "Importar"}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

