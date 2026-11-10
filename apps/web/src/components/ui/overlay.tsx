"use client";

import { X } from "lucide-react";
import { Dialog as D, DropdownMenu as M } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

/** Painel lateral (padrão para detalhes de tarefa/arquivo). Foco preso enquanto aberto; Esc fecha. */
export function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; description?: string; children: ReactNode }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <D.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col gap-4 overflow-y-auto border-l border-glass-border bg-glass-strong p-6 shadow-glass backdrop-blur-xl focus:outline-none"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <D.Title className="font-display text-2xl font-black lowercase tracking-tighter">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-text-2">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="inline-flex size-9 items-center justify-center rounded-xl hover:bg-accent-soft" aria-label="Fechar painel">
              <X className="size-[18px]" aria-hidden />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Confirmação para ações destrutivas (único uso aceito de modal, ver design system). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  danger = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <D.Content className="glass fixed top-1/2 left-1/2 z-50 grid w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-[22px] bg-glass-strong p-6 focus:outline-none">
          <D.Title className="text-lg font-black">{title}</D.Title>
          <D.Description className="text-sm text-text-2">{description}</D.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <D.Close asChild>
              <Button variant="secondary">Cancelar</Button>
            </D.Close>
            <Button
              variant={danger ? "danger" : "primary"}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/** Menu suspenso acessível (navegação por teclado, foco gerenciado pelo Radix). */
export const Menu = M.Root;
export const MenuTrigger = M.Trigger;

export function MenuContent({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <M.Portal>
      <M.Content align="end" sideOffset={8} className="glass z-50 grid min-w-[210px] gap-0.5 rounded-2xl bg-glass-strong p-2 backdrop-blur-xl">
        {label && <M.Label className="label-mono px-2 pt-1.5 pb-2">{label}</M.Label>}
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function MenuRadio({ value, onValueChange, options }: { value: string; onValueChange: (v: string) => void; options: { value: string; label: string; hint?: string }[] }) {
  return (
    <M.RadioGroup value={value} onValueChange={onValueChange}>
      {options.map((o) => (
        <M.RadioItem
          key={o.value}
          value={o.value}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-[10px] px-2 py-2 text-sm outline-none data-[highlighted]:bg-accent-soft data-[state=checked]:font-bold data-[state=checked]:text-accent-text",
          )}
        >
          <span className="flex-1">
            {o.label}
            {o.hint && <span className="ml-2 text-xs font-normal text-text-2">{o.hint}</span>}
          </span>
          <M.ItemIndicator aria-hidden>✓</M.ItemIndicator>
        </M.RadioItem>
      ))}
    </M.RadioGroup>
  );
}
