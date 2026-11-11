"use client";

import type { ClientDto, ProjectDto } from "@studio/contracts";
import { Mail, Phone, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LoadError, PageHeader, ProjectStatusBadge } from "@/components/app/common";
import { clean, EntityForm } from "@/components/app/entity-form";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/display";
import { Input } from "@/components/ui/field";
import { ConfirmDialog, Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";
import { useUrlSelection } from "@/lib/query";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";

/** Clientes e contatos (E12-1), com os projetos de cada um. Dados mínimos (LGPD). */
export default function Clientes() {
  const { ws } = useSession();
  const [q, setQ] = useState("");
  const clients = useList<ClientDto>(ws(`/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`));
  const [open, setOpen] = useUrlSelection<ClientDto, "novo">(clients.items);

  return (
    <>
      <PageHeader
        title="seus"
        script="clientes"
        description="Quem contrata seu trabalho. Projetos da categoria Cliente ficam ligados aqui."
        actions={
          <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setOpen("novo")}>
            Novo cliente
          </Button>
        }
      />
      <div className="glass rounded-2xl p-2">
        <Input type="search" aria-label="Buscar clientes" placeholder="Buscar por nome, empresa ou e-mail…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      </div>
      {clients.error && <LoadError message={clients.error} onRetry={clients.reload} />}
      {clients.loading && !clients.data ? (
        <Skeleton className="h-40" />
      ) : clients.items.length === 0 ? (
        <Card>
          <EmptyState icon={<Users aria-hidden />} title={q ? "ninguém encontrado" : "sem clientes ainda"} description={q ? "Tente outro termo." : "Cadastre clientes para vincular aos projetos da categoria Cliente."} action={!q ? <Button onClick={() => setOpen("novo")}>Cadastrar cliente</Button> : undefined} />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.items.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setOpen(c)} className="glass grid h-full w-full gap-2 rounded-[22px] p-5 text-left hover:border-accent-text">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-display font-black text-accent-text">
                    {c.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate">{c.name}</b>
                    {c.company && <span className="block truncate text-xs text-text-2">{c.company}</span>}
                  </span>
                </span>
                <span className="grid gap-1 text-xs text-text-2">
                  {c.email && <span className="flex items-center gap-1.5 truncate"><Mail aria-hidden className="size-3.5" />{c.email}</span>}
                  {c.phone && <span className="flex items-center gap-1.5"><Phone aria-hidden className="size-3.5" />{c.phone}</span>}
                </span>
                <span className="label-mono">{c._count?.projects ?? 0} projeto(s)</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ClientSheet value={open} onClose={() => setOpen(null)} onSaved={clients.reload} />
    </>
  );
}

function ClientSheet({ value, onClose, onSaved }: { value: ClientDto | "novo" | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const { ws } = useSession();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const c = value === "novo" ? null : value;
  const projects = useList<ProjectDto>(c ? ws(`/projects?clientId=${c.id}`) : null);

  return (
    <Sheet open={value !== null} onOpenChange={(v) => !v && onClose()} title={c ? "cliente" : "novo cliente"}>
      {value !== null && (
        <EntityForm
          key={c?.id ?? "novo"}
          initial={{ name: c?.name ?? "", company: c?.company ?? "", email: c?.email ?? "", phone: c?.phone ?? "", notes: c?.notes ?? "" }}
          fields={[
            { name: "name", label: "Nome", required: true, wide: true },
            { name: "company", label: "Empresa" },
            { name: "phone", label: "Telefone", type: "tel" },
            { name: "email", label: "E-mail", type: "email", wide: true },
            { name: "notes", label: "Observações", type: "textarea" },
          ]}
          onSubmit={async (v) => {
            const body = clean(v);
            if (c) await api(ws(`/clients/${c.id}`), { method: "PATCH", body });
            else await api(ws("/clients"), { method: "POST", body });
            toast(c ? "Cliente salvo" : "Cliente cadastrado");
            onClose();
            await onSaved();
          }}
          onDelete={c ? () => setConfirm(true) : undefined}
        />
      )}
      {c && (
        <div className="grid gap-2 border-t border-line pt-4">
          <p className="label-mono">Projetos</p>
          {projects.items.length === 0 ? (
            <p className="text-sm text-text-2">Nenhum projeto vinculado.</p>
          ) : (
            <ul className="grid gap-1">
              {projects.items.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Link href={`/projetos/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-accent-text">
                    {p.name}
                  </Link>
                  <ProjectStatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Excluir cliente?"
        description="Os dados de contato serão apagados definitivamente (LGPD). Os projetos continuam, sem cliente vinculado."
        confirmLabel="Excluir"
        danger
        onConfirm={async () => {
          if (!c) return;
          await api(ws(`/clients/${c.id}`), { method: "DELETE" }).catch((e: unknown) => toast(errorMessage(e)));
          onClose();
          await onSaved();
        }}
      />
    </Sheet>
  );
}
