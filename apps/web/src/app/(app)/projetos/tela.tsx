"use client";

import { projectCategoryLabel, type ProjectCategory, type ProjectDto } from "@studio/contracts";
import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadError, PageHeader, PROJECT_STATUS_OPTS, ProjectStatusBadge, Tabs } from "@/components/app/common";
import { ProjectSheet } from "@/components/app/project-sheet";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Progress, Skeleton } from "@/components/ui/display";
import { Input, Select } from "@/components/ui/field";
import { fmtDate } from "@/lib/format";
import { useQueryParam } from "@/lib/query";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";

type CatTab = "ALL" | ProjectCategory;

export default function Projetos() {
  const { ws } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<CatTab>("ALL");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  // `?novo=1` (vindo do Dashboard) abre o painel de criação; depois vale a escolha da usuária.
  const novo = useQueryParam("novo");
  const [creatingState, setCreating] = useState<boolean | null>(null);
  const creating = creatingState ?? novo === "1";

  const list = useList<ProjectDto>(ws("/projects"));
  const filtered = list.items.filter(
    (p) => (tab === "ALL" || p.category === tab) && (!status || p.status === status) && (!q || p.name.toLowerCase().includes(q.toLowerCase())),
  );
  const count = (c: CatTab) => (c === "ALL" ? list.items.length : list.items.filter((p) => p.category === c).length);

  return (
    <>
      <PageHeader
        title="seus"
        script="projetos"
        description="Pessoais, produtos próprios, clientes e trabalho profissional. O progresso vem das tarefas concluídas."
        actions={
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setCreating(true)}>
            Novo projeto
          </Button>
        }
      />
      <Tabs<CatTab>
        label="Categorias"
        value={tab}
        onChange={setTab}
        items={[{ value: "ALL", label: "Todos", count: count("ALL") }, ...(Object.keys(projectCategoryLabel) as ProjectCategory[]).map((c) => ({ value: c, label: projectCategoryLabel[c], count: count(c) }))]}
      />
      <div className="glass flex flex-wrap gap-2 rounded-2xl p-2">
        <Input type="search" aria-label="Filtrar por nome" placeholder="Filtrar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[220px]">
          <option value="">Todos os status</option>
          {PROJECT_STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {list.error && <LoadError message={list.error} onRetry={list.reload} />}
      {list.loading && !list.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderKanban aria-hidden />}
            title={list.items.length === 0 ? "comece aqui" : "nada por aqui"}
            description={list.items.length === 0 ? "Cadastre seus projetos reais para acompanhar tarefas, marcos, notas e arquivos em um só lugar." : "Nenhum projeto com esses filtros."}
            action={list.items.length === 0 ? <Button onClick={() => setCreating(true)}>Criar o primeiro projeto</Button> : undefined}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link href={`/projetos/${p.id}`} className="glass grid h-full gap-3 rounded-[22px] p-5 transition-colors hover:border-accent-text">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent font-display text-xl font-black text-white">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-lg leading-tight">{p.name}</b>
                    <span className="text-xs text-text-2">
                      {projectCategoryLabel[p.category]}
                      {p.client ? ` · ${p.client.name}` : ""}
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ProjectStatusBadge status={p.status} />
                  {p.dueDate && <span className="font-mono text-xs text-text-2">entrega {fmtDate(p.dueDate)}</span>}
                </div>
                <Progress value={p.progress?.percent ?? null} label={`Progresso de ${p.name}`} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <ProjectSheet open={creating} onOpenChange={setCreating} project={null} onSaved={(p) => router.push(`/projetos/${p.id}`)} />
    </>
  );
}
