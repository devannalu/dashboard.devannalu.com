"use client";

import { createContext, useContext, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Liga rótulo, dica e erro ao controle (ids + aria-describedby) sem o chamador montar ids. */
const FieldCtx = createContext<{ id: string; describedBy?: string; invalid: boolean } | null>(null);

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-dica` : undefined;
  const errorId = error ? `${id}-erro` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <FieldCtx.Provider value={{ id, describedBy, invalid: Boolean(error) }}>
      <div className={cn("grid gap-1.5", className)}>
        <label htmlFor={id} className="label-mono">
          {label}
          {required && <span aria-hidden className="text-danger"> *</span>}
        </label>
        {children}
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-2">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldCtx.Provider>
  );
}

function useFieldProps(required?: boolean) {
  const ctx = useContext(FieldCtx);
  return ctx ? { id: ctx.id, "aria-describedby": ctx.describedBy, "aria-invalid": ctx.invalid || undefined, "aria-required": required || undefined } : {};
}

const CONTROL =
  "w-full rounded-xl border border-line bg-field px-3 text-sm text-text placeholder:text-text-2 focus-visible:border-accent-text aria-[invalid=true]:border-danger disabled:opacity-60";

export function Input({ className, required, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input required={required} {...useFieldProps(required)} className={cn(CONTROL, "h-10", className)} {...rest} />;
}

export function Textarea({ className, required, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea required={required} {...useFieldProps(required)} className={cn(CONTROL, "min-h-24 py-2", className)} {...rest} />;
}

export function Select({ className, required, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select required={required} {...useFieldProps(required)} className={cn(CONTROL, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}
