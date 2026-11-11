"use client";

import {
  priorityLabel,
  projectCategoryLabel,
  projectStatusLabel,
  taskStatusLabel,
  type Priority,
  type ProjectStatus,
  type TaskStatus,
} from "@studio/contracts";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "../ui/display";

/** Título de página no padrão da colagem: grotesca pesada + palavra em script. */
export function PageHeader({ title, script, description, actions }: { title: string; script?: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="glass flex flex-wrap items-end gap-4 rounded-[22px] px-5 py-4 sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-4xl leading-none font-black tracking-tighter lowercase sm:text-5xl">
          {title}
          {script && (
            <>
              {" "}
              <em className="font-script text-5xl font-normal tracking-normal normal-case not-italic text-accent-text sm:text-6xl">{script}</em>
            </>
          )}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-text-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Check de tarefa em forma de cereja (D-23). Botão acessível com estado anunciado. */
export function CherryCheck({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex size-7 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
    >
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <path d="M12 3c0 3 1 5 3 7" className="fill-none stroke-success" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="12" cy="15" r="6.5" className={cn("stroke-accent-text transition-colors", checked ? "fill-accent-text" : "fill-transparent group-hover:fill-accent-soft")} strokeWidth="1.8" />
        {checked && <path d="M9.2 15.2l1.9 1.9 3.8-3.9" className="fill-none stroke-bg" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </button>
  );
}

const PROJECT_TONE: Record<ProjectStatus, "accent" | "success" | "warn" | "info" | "neutral"> = {
  IDEA: "neutral",
  PLANNING: "info",
  IN_PROGRESS: "accent",
  PAUSED: "warn",
  COMPLETED: "success",
  ARCHIVED: "neutral",
};
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={PROJECT_TONE[status]}>{projectStatusLabel[status]}</Badge>;
}

const TASK_TONE: Record<TaskStatus, "accent" | "success" | "warn" | "info" | "neutral"> = {
  BACKLOG: "neutral",
  TODO: "info",
  IN_PROGRESS: "accent",
  IN_REVIEW: "warn",
  DONE: "success",
};
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={TASK_TONE[status]}>{taskStatusLabel[status]}</Badge>;
}

export function PriorityText({ priority }: { priority: Priority }) {
  if (priority === "MEDIUM" || priority === "LOW") return null;
  return <span className={cn("font-mono text-[11px] font-bold uppercase", priority === "URGENT" ? "text-danger" : "text-warn")}>{priorityLabel[priority]}</span>;
}

/** Opções prontas para os selects. */
const opts = <K extends string>(labels: Record<K, string>) => (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }));
export const PROJECT_STATUS_OPTS = opts(projectStatusLabel);
export const PROJECT_CATEGORY_OPTS = opts(projectCategoryLabel);
export const PRIORITY_OPTS = opts(priorityLabel);
export const TASK_STATUS_OPTS = opts(taskStatusLabel);

/** Bloco de erro de carregamento com opção de tentar de novo. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-danger px-4 py-3 text-sm font-semibold text-danger">
      {message}
      <button type="button" className="underline" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}

/** Abas simples e acessíveis (estado na página). */
export function Tabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="glass flex flex-wrap gap-1 rounded-2xl px-2 pt-1">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
            value === it.value ? "border-accent-text text-accent-text" : "border-transparent text-text-2 hover:text-text",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1.5 font-mono text-xs opacity-70">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}
