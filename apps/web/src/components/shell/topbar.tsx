"use client";

import type { SearchResult } from "@studio/contracts";
import { CheckSquare, FileText, FolderKanban, FolderOpen, Images, Lightbulb, LogOut, Menu as MenuIcon, Plus, Search, UserRound, Users } from "lucide-react";
import { DropdownMenu as M } from "radix-ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Colagem } from "@/lib/preferences";
import { useSession } from "@/lib/session";
import { Button, IconButton } from "../ui/button";
import { Field, Input, Select, Textarea } from "../ui/field";
import { Menu, MenuContent, MenuRadio, MenuTrigger, Sheet } from "../ui/overlay";
import { useToast } from "../ui/toast";
import { ThemeToggle } from "../theme-toggle";

const COLAGEM_OPTS: { value: Colagem; label: string; hint?: string }[] = [
  { value: "off", label: "Desligada", hint: "só a cor" },
  { value: "sutil", label: "Sutil" },
  { value: "presente", label: "Presente" },
  { value: "total", label: "Total" },
];

const KIND = {
  project: { label: "Projeto", icon: FolderKanban, href: (id: string) => `/projetos/${id}` },
  task: { label: "Tarefa", icon: CheckSquare, href: (id: string) => `/tarefas?abrir=${id}` },
  note: { label: "Nota", icon: FileText, href: (id: string) => `/notas?abrir=${id}` },
  idea: { label: "Ideia", icon: Lightbulb, href: (id: string) => `/ideias?abrir=${id}` },
  client: { label: "Cliente", icon: Users, href: (id: string) => `/clientes?abrir=${id}` },
  file: { label: "Arquivo", icon: FolderOpen, href: () => `/arquivos` },
} as const;

/** Busca global (E13): resultados agrupados de todos os módulos. Atalho Ctrl/⌘ K. */
function SearchSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { ws } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ q: string; data: SearchResult[] } | null>(null);
  const term = q.trim();
  const results = found && found.q === term && term.length >= 2 ? found.data : null;

  useEffect(() => {
    if (!open || term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      api<{ data: SearchResult[] }>(ws(`/search?q=${encodeURIComponent(term)}`), { signal: ctrl.signal })
        .then((r) => setFound({ q: term, data: r.data }))
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term, open, ws]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="buscar" description="Projetos, tarefas, notas, ideias, clientes e arquivos.">
      <Input autoFocus type="search" aria-label="Termo de busca" placeholder="Digite pelo menos 2 letras…" value={q} onChange={(e) => setQ(e.target.value)} />
      {results && results.length === 0 && <p className="text-sm text-text-2">Nada encontrado para “{q}”.</p>}
      {results && results.length > 0 && (
        <ul className="grid gap-1" aria-label="Resultados">
          {results.map((r) => {
            const k = KIND[r.kind];
            const Icon = k.icon;
            return (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    router.push(k.href(r.id));
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-accent-soft"
                >
                  <Icon aria-hidden className="size-4 shrink-0 text-accent-text" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-xs text-text-2">{r.subtitle}</span>}
                  </span>
                  <span className="label-mono">{k.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

/** Captura rápida (E9-6): vira nota na Inbox, tarefa avulsa ou ideia. */
export function CaptureSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { ws } = useSession();
  const toast = useToast();
  const [kind, setKind] = useState<"note" | "task" | "idea">("note");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setSaving(true);
    setError(null);
    const [first, ...rest] = value.split("\n");
    try {
      if (kind === "note") await api(ws("/notes"), { method: "POST", body: { title: first!.slice(0, 200), content: rest.join("\n") } });
      if (kind === "task") await api(ws("/tasks"), { method: "POST", body: { title: first!.slice(0, 300), description: rest.join("\n") || null } });
      if (kind === "idea") await api(ws("/ideas"), { method: "POST", body: { title: first!.slice(0, 200), description: rest.join("\n") || null } });
      toast(kind === "note" ? "Nota salva na Inbox" : kind === "task" ? "Tarefa criada" : "Ideia guardada no Idea Lab");
      setText("");
      onOpenChange(false);
      window.dispatchEvent(new CustomEvent("dados-alterados"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="capturar" description="Anote agora, organize depois. A primeira linha vira o título.">
      <form onSubmit={submit} className="grid gap-4">
        {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
        <Field label="Tipo">
          <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="note">Nota (Inbox)</option>
            <option value="task">Tarefa</option>
            <option value="idea">Ideia</option>
          </Select>
        </Field>
        <Field label="Texto da captura" required>
          <Textarea
            autoFocus
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit(e);
            }}
          />
        </Field>
        <Button type="submit" loading={saving} disabled={!text.trim()}>
          Salvar <kbd className="ml-1 font-mono text-[11px] opacity-80">Ctrl+Enter</kbd>
        </Button>
      </form>
    </Sheet>
  );
}

export function Topbar({ title, colagem, onColagem, onOpenDrawer, drawerOpen }: { title: string; colagem: Colagem; onColagem: (v: Colagem) => void; onOpenDrawer: () => void; drawerOpen: boolean }) {
  const { me, logout } = useSession();
  const [search, setSearch] = useState(false);
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="glass sticky top-0 z-20 flex min-w-0 items-center gap-2 rounded-none border-x-0 border-t-0 px-4 py-2.5 shadow-none sm:gap-2.5 sm:px-7">
      <IconButton label="Abrir menu" aria-expanded={drawerOpen} aria-controls="menu-principal" onClick={onOpenDrawer} className="lg:hidden">
        <MenuIcon aria-hidden />
      </IconButton>
      <span className="label-mono hidden sm:inline">{title}</span>

      <button
        type="button"
        onClick={() => setSearch(true)}
        aria-label="Buscar"
        className="ml-auto flex h-10 min-w-10 flex-1 items-center gap-2.5 overflow-hidden rounded-xl border border-line bg-field px-3 text-sm text-text-2 sm:max-w-[340px]"
      >
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 truncate max-[420px]:sr-only">Buscar projetos, tarefas, notas…</span>
        <kbd className="ml-auto hidden rounded-[5px] border border-line px-1.5 font-mono text-[11px] font-bold sm:inline">Ctrl K</kbd>
      </button>

      <Menu>
        <MenuTrigger asChild>
          <IconButton label="Colagem do fundo">
            <Images aria-hidden />
          </IconButton>
        </MenuTrigger>
        <MenuContent label="Colagem do fundo">
          <MenuRadio value={colagem} onValueChange={(v) => onColagem(v as Colagem)} options={COLAGEM_OPTS} />
        </MenuContent>
      </Menu>

      <ThemeToggle />

      <Menu>
        <MenuTrigger asChild>
          <IconButton label="Sua conta">
            <UserRound aria-hidden />
          </IconButton>
        </MenuTrigger>
        <MenuContent label={me.user.name}>
          <p className="px-2 pb-2 text-xs text-text-2">{me.user.email}</p>
          <M.Item onSelect={() => void logout()} className="flex cursor-pointer items-center gap-2 rounded-[10px] px-2 py-2 text-sm outline-none data-[highlighted]:bg-accent-soft">
            <LogOut aria-hidden className="size-4" /> Sair
          </M.Item>
        </MenuContent>
      </Menu>

      <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => setCapture(true)} className="max-sm:px-3">
        <span className="max-sm:sr-only">Capturar</span>
      </Button>

      <SearchSheet open={search} onOpenChange={setSearch} />
      <CaptureSheet open={capture} onOpenChange={setCapture} />
    </header>
  );
}
