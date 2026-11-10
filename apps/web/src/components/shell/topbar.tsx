"use client";

import { Images, Menu as MenuIcon, Plus, Search } from "lucide-react";
import type { Colagem } from "@/lib/preferences";
import { Button, IconButton } from "../ui/button";
import { Menu, MenuContent, MenuRadio, MenuTrigger } from "../ui/overlay";
import { useToast } from "../ui/toast";
import { ThemeToggle } from "../theme-toggle";

const COLAGEM_OPTS: { value: Colagem; label: string; hint?: string }[] = [
  { value: "off", label: "Desligada", hint: "só a cor" },
  { value: "sutil", label: "Sutil" },
  { value: "presente", label: "Presente" },
  { value: "total", label: "Total" },
];

export function Topbar({ title, colagem, onColagem, onOpenDrawer, drawerOpen }: { title: string; colagem: Colagem; onColagem: (v: Colagem) => void; onOpenDrawer: () => void; drawerOpen: boolean }) {
  const toast = useToast();
  return (
    <header className="glass sticky top-0 z-20 flex min-w-0 items-center gap-2 rounded-none border-x-0 border-t-0 px-4 py-2.5 shadow-none sm:gap-2.5 sm:px-7">
      <IconButton label="Abrir menu" aria-expanded={drawerOpen} aria-controls="menu-principal" onClick={onOpenDrawer} className="lg:hidden">
        <MenuIcon aria-hidden />
      </IconButton>
      <span className="label-mono hidden sm:inline">{title}</span>

      {/* Busca global (E13): por enquanto apenas o atalho visual, sem resultados. */}
      <button
        type="button"
        onClick={() => toast("A busca global chega junto com os primeiros módulos.")}
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

      <Button icon={<Plus aria-hidden className="size-4" />} onClick={() => toast("A captura rápida chega com o módulo de Notas.")} className="max-sm:px-3">
        <span className="max-sm:sr-only">Capturar</span>
      </Button>
    </header>
  );
}
