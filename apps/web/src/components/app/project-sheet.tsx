"use client";

import type { ClientDto, ProjectDto } from "@studio/contracts";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useList } from "@/lib/use-data";
import { Sheet } from "../ui/overlay";
import { useToast } from "../ui/toast";
import { PRIORITY_OPTS, PROJECT_CATEGORY_OPTS, PROJECT_STATUS_OPTS } from "./common";
import { clean, EntityForm } from "./entity-form";

/** Criar/editar projeto. Categoria Cliente pede o cliente; Trabalho profissional mostra aviso (doc 03). */
export function ProjectSheet({ open, onOpenChange, project, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; project: ProjectDto | null; onSaved: (p: ProjectDto) => void | Promise<void> }) {
  const { ws } = useSession();
  const toast = useToast();
  const clients = useList<ClientDto>(open ? ws("/clients") : null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={project ? "editar projeto" : "novo projeto"}>
      {open && (
        <EntityForm
          key={project?.id ?? "novo"}
          initial={{
            name: project?.name ?? "",
            category: project?.category ?? "PERSONAL",
            status: project?.status ?? "PLANNING",
            priority: project?.priority ?? "MEDIUM",
            clientId: project?.clientId ?? "",
            startDate: project?.startDate?.slice(0, 10) ?? "",
            dueDate: project?.dueDate?.slice(0, 10) ?? "",
            description: project?.description ?? "",
          }}
          fields={[
            { name: "name", label: "Nome", required: true, wide: true },
            { name: "category", label: "Categoria", type: "select", options: PROJECT_CATEGORY_OPTS },
            { name: "status", label: "Status", type: "select", options: PROJECT_STATUS_OPTS },
            {
              name: "clientId",
              label: "Cliente",
              type: "select",
              wide: true,
              when: (v) => v.category === "CLIENT",
              hint: clients.items.length === 0 ? "Cadastre o cliente em Clientes primeiro." : undefined,
              options: [{ value: "", label: "Escolha o cliente" }, ...clients.items.map((c) => ({ value: c.id, label: c.company ? `${c.name} · ${c.company}` : c.name }))],
            },
            { name: "priority", label: "Prioridade", type: "select", options: PRIORITY_OPTS },
            { name: "startDate", label: "Início", type: "date" },
            { name: "dueDate", label: "Entrega", type: "date" },
            { name: "description", label: "Descrição", type: "textarea" },
          ]}
          onSubmit={async (v) => {
            const body = clean(v);
            if (body.category !== "CLIENT") body.clientId = null;
            const saved = project
              ? await api<ProjectDto>(ws(`/projects/${project.id}`), { method: "PATCH", body })
              : await api<ProjectDto>(ws("/projects"), { method: "POST", body });
            toast(project ? "Projeto salvo" : "Projeto criado");
            onOpenChange(false);
            await onSaved(saved);
          }}
          submitLabel={project ? "Salvar" : "Criar projeto"}
        />
      )}
      {open && (
        <p className="text-xs text-text-2">
          Projetos de <b>Trabalho profissional</b>: registre só o que seu empregador permite (Q6).
        </p>
      )}
    </Sheet>
  );
}
