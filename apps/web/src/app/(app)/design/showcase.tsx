"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Badge, Card, CardHeader, EmptyState, Progress, Skeleton, Tag } from "@/components/ui/display";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Sheet } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/toast";

/** Exemplos de uso dos componentes (textos ilustrativos, não são dados da usuária). */
export function DesignShowcase() {
  const toast = useToast();
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Card>
        <p className="label-mono mb-2">Interno · só em desenvolvimento</p>
        <h1 className="font-display text-4xl font-black tracking-tighter lowercase">
          design <em className="font-script text-6xl font-normal tracking-normal normal-case not-italic text-accent-text">system</em>
        </h1>
        <p className="mt-2 text-sm text-text-2">Troque tema e colagem na barra superior para revisar os dois modos.</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Botões" />
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Discreto</Button>
            <Button variant="danger">Excluir</Button>
            <Button size="sm">Pequeno</Button>
            <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
              Salvar
            </Button>
            <Button disabled>Desabilitado</Button>
            <IconButton label="Excluir item"><Trash2 aria-hidden /></IconButton>
          </div>
        </Card>

        <Card>
          <CardHeader title="Campos" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do projeto" required hint="Pode ser alterado depois.">
              <Input placeholder="Ex.: Site institucional" />
            </Field>
            <Field label="Categoria">
              <Select defaultValue="CLIENT">
                <option value="PERSONAL">Pessoal</option>
                <option value="OWNED_PRODUCT">Produto próprio</option>
                <option value="CLIENT">Cliente</option>
                <option value="PROFESSIONAL_WORK">Trabalho profissional</option>
              </Select>
            </Field>
            <Field label="E-mail" error="Informe um e-mail válido.">
              <Input type="email" defaultValue="exemplo@" />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <Textarea placeholder="Objetivo do projeto em poucas linhas" />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Status, tags e progresso" action={<a href="#">Ver todos</a>} />
          <div className="flex flex-wrap gap-4">
            <Badge tone="accent">Em andamento</Badge>
            <Badge tone="info">Planejamento</Badge>
            <Badge tone="warn">Pausado</Badge>
            <Badge tone="success">Concluído</Badge>
            <Badge tone="danger">Atrasada</Badge>
            <Tag>cliente</Tag>
            <Tag>urgente</Tag>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Progress label="Progresso do exemplo A" value={62} />
            <Progress label="Progresso do exemplo B" value={null} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Carregando e vazio" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
          <EmptyState title="Nada por aqui" description="Seus projetos vão morar aqui. Crie o primeiro quando o módulo estiver pronto." action={<Button variant="secondary">Ação principal</Button>} />
        </Card>

        <Card>
          <CardHeader title="Painel, confirmação e aviso" />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSheet(true)}>Abrir painel lateral</Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>Confirmar exclusão</Button>
            <Button variant="ghost" onClick={() => toast("Tarefa concluída", { label: "Desfazer", onClick: () => toast("Conclusão desfeita") })}>Mostrar aviso</Button>
          </div>
        </Card>
      </div>

      <Sheet open={sheet} onOpenChange={setSheet} title="Detalhe da tarefa" description="Exemplo do painel lateral usado em tarefas e arquivos.">
        <Field label="Título">
          <Input defaultValue="Revisar layout" />
        </Field>
        <Button onClick={() => setSheet(false)}>Fechar</Button>
      </Sheet>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        danger
        title="Excluir projeto?"
        description="Ele vai para a lixeira e pode ser restaurado por 30 dias."
        confirmLabel="Excluir"
        onConfirm={() => toast("Projeto movido para a lixeira")}
      />
    </>
  );
}
