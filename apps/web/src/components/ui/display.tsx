import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Card de vidro fosco (D-17). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("glass min-w-0 rounded-[22px] p-5 sm:p-6", className)} {...rest} />;
}

/** Cabeçalho de card: rótulo mono + ação opcional à direita. */
export function CardHeader({ title, action, id }: { title: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 id={id} className="label-mono">
        {title}
      </h2>
      {action && <div className="ml-auto text-sm font-bold text-accent-text">{action}</div>}
    </div>
  );
}

type Tone = "accent" | "success" | "warn" | "danger" | "info" | "neutral";
const DOT: Record<Tone, string> = {
  accent: "bg-accent-text",
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-text-2",
};

/** Selo de status discreto: ponto + texto (cor nunca é o único indicador). */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-2">
      <span aria-hidden className={cn("size-[7px] rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-6 items-center rounded-md bg-accent-soft px-2 text-xs font-semibold text-accent-text">{children}</span>;
}

/** Barra de progresso sempre acompanhada de texto. `value` nulo = "Sem dados" (nunca 0% inventado). */
export function Progress({ value, label, emptyLabel = "Sem tarefas" }: { value: number | null; label: string; emptyLabel?: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="grid gap-1">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : pct}
        aria-valuetext={value === null ? emptyLabel : `${pct}%`}
        className="h-1.5 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-accent-text transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-text-2">{value === null ? emptyLabel : `${pct}%`}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-lg bg-line", className)} />;
}

/** Estado vazio útil: explica, convida e oferece a ação principal. */
export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 px-4 py-10 text-center">
      {icon && <div className="text-accent-text [&_svg]:size-10">{icon}</div>}
      <p className="font-script text-5xl leading-none text-accent-text">{title}</p>
      <p className="max-w-md text-sm text-text-2">{description}</p>
      {action}
    </div>
  );
}
