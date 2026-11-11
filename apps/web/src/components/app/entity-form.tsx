"use client";

import { useState, type FormEvent } from "react";
import { ApiError, errorMessage } from "@/lib/api";
import { Button } from "../ui/button";
import { Field, Input, Select, Textarea } from "../ui/field";

export type FormValues = Record<string, string | boolean>;

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "time" | "email" | "tel" | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Ocupa a linha inteira na grade de 2 colunas. */
  wide?: boolean;
  /** Mostra o campo só quando a função retornar true. */
  when?: (v: FormValues) => boolean;
}

/**
 * Formulário genérico usado nos painéis de criação/edição.
 * Erros da API (422) aparecem no campo correspondente; demais erros no topo.
 */
export function EntityForm({
  fields,
  initial,
  onSubmit,
  submitLabel = "Salvar",
  onDelete,
  deleteLabel = "Excluir",
  onChange,
}: {
  fields: FieldDef[];
  initial: FormValues;
  onSubmit: (values: FormValues) => Promise<void>;
  submitLabel?: string;
  onDelete?: () => void;
  deleteLabel?: string;
  /** Avisa a cada alteração (ex.: trocar o projeto recarrega a lista de marcos). */
  onChange?: (values: FormValues) => void;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (name: string, v: string | boolean) => {
    const next = { ...values, [name]: v };
    setValues(next);
    onChange?.(next);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setGeneral(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields);
      setGeneral(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {general && (
        <p role="alert" className="rounded-xl border border-danger px-3 py-2 text-sm font-semibold text-danger">
          {general}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields
          .filter((f) => !f.when || f.when(values))
          .map((f) => {
            const v = values[f.name];
            if (f.type === "checkbox") {
              return (
                <label key={f.name} className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
                  <input type="checkbox" checked={v === true} onChange={(e) => set(f.name, e.target.checked)} className="size-4 accent-accent" />
                  {f.label}
                </label>
              );
            }
            const common = { value: typeof v === "string" ? v : "", required: f.required, placeholder: f.placeholder };
            return (
              <Field key={f.name} label={f.label} hint={f.hint} error={errors[f.name]} required={f.required} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : undefined}>
                {f.type === "textarea" ? (
                  <Textarea {...common} rows={5} onChange={(e) => set(f.name, e.target.value)} />
                ) : f.type === "select" ? (
                  <Select {...common} onChange={(e) => set(f.name, e.target.value)}>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input {...common} type={f.type ?? "text"} onChange={(e) => set(f.name, e.target.value)} />
                )}
              </Field>
            );
          })}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
        {onDelete && (
          <Button variant="danger" className="ml-auto" onClick={onDelete}>
            {deleteLabel}
          </Button>
        )}
      </div>
    </form>
  );
}

/** Converte "" em null (a API usa null para limpar campos opcionais). */
export function clean(values: FormValues): Record<string, string | boolean | null> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]));
}
