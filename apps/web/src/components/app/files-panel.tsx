"use client";

import type { FileDto, ProjectDto } from "@studio/contracts";
import { Download, FileIcon, FolderOpen, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { fmtBytes, fmtDateTime } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";
import { Button, IconButton } from "../ui/button";
import { EmptyState, Skeleton } from "../ui/display";
import { Input, Select } from "../ui/field";
import { ConfirmDialog } from "../ui/overlay";
import { useToast } from "../ui/toast";
import { LoadError } from "./common";

const ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.avif,.svg,.pdf,.txt,.md,.csv,.docx,.xlsx,.pptx,.odt,.ods,.odp,.fig,.psd,.ai,.zip";

/** Envio, lista, download e exclusão de arquivos (E11). Com `projectId`, mostra só os do projeto. */
export function FilesPanel({ projectId }: { projectId?: string }) {
  const { ws } = useSession();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [removing, setRemoving] = useState<FileDto | null>(null);
  const scopeProject = projectId ?? filterProject;
  const files = useList<FileDto>(ws(`/files${scopeProject ? `?projectId=${scopeProject}` : ""}`));
  const projects = useList<ProjectDto>(projectId ? null : ws("/projects"));
  const shown = files.items.filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(list)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const target = scopeProject && scopeProject !== "null" ? `?projectId=${scopeProject}` : "";
        await api(ws(`/files${target}`), { method: "POST", form });
        ok += 1;
      } catch (e) {
        toast(`${file.name}: ${errorMessage(e)}`);
      }
    }
    if (ok) toast(ok === 1 ? "Arquivo enviado" : `${ok} arquivos enviados`);
    setUploading(false);
    if (input.current) input.current.value = "";
    await files.reload();
  }

  async function remove(f: FileDto) {
    try {
      await api(ws(`/files/${f.id}`), { method: "DELETE" });
      toast("Arquivo excluído");
      await files.reload();
    } catch (e) {
      toast(errorMessage(e));
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input ref={input} type="file" multiple accept={ACCEPT} className="sr-only" id="enviar-arquivo" onChange={(e) => void upload(e.target.files)} />
        <Button icon={<Upload aria-hidden className="size-4" />} loading={uploading} onClick={() => input.current?.click()}>
          Enviar arquivos
        </Button>
        <Input type="search" aria-label="Filtrar arquivos" placeholder="Filtrar por nome…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        {!projectId && (
          <Select aria-label="Projeto" value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="max-w-[240px]">
            <option value="">Todos os arquivos</option>
            <option value="null">Sem projeto</option>
            {projects.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </div>
      <p className="text-xs text-text-2">Imagens até 25 MB, documentos até 50 MB, design e ZIP até 200 MB. Executáveis e páginas HTML não são aceitos.</p>

      {files.error && <LoadError message={files.error} onRetry={files.reload} />}
      {files.loading && !files.data ? (
        <Skeleton className="h-24" />
      ) : shown.length === 0 ? (
        <EmptyState icon={<FolderOpen aria-hidden />} title="sem arquivos" description="Contratos, referências, logos, exportações… tudo guardado no seu armazenamento privado." />
      ) : (
        <ul className="grid gap-1">
          {shown.map((f) => (
            <li key={f.id} className="flex items-center gap-3 border-t border-line py-2 first:border-0">
              <FileIcon aria-hidden className="size-5 shrink-0 text-accent-text" />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-sm">{f.name}</b>
                <span className="block truncate text-xs text-text-2">
                  {fmtBytes(f.size)} · {fmtDateTime(f.createdAt)}
                  {!projectId && f.project && (
                    <>
                      {" · "}
                      <Link className="underline" href={`/projetos/${f.project.id}`}>
                        {f.project.name}
                      </Link>
                    </>
                  )}
                </span>
              </span>
              <a href={ws(`/files/${f.id}/download`)} className="inline-flex size-10 items-center justify-center rounded-xl hover:bg-accent-soft" aria-label={`Baixar ${f.name}`} title="Baixar">
                <Download aria-hidden className="size-[18px]" />
              </a>
              <IconButton variant="ghost" label={`Excluir ${f.name}`} onClick={() => setRemoving(f)}>
                <Trash2 aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Excluir arquivo?"
        description={`“${removing?.name ?? ""}” será apagado definitivamente do armazenamento.`}
        confirmLabel="Excluir"
        danger
        onConfirm={() => removing && void remove(removing)}
      />
    </div>
  );
}
