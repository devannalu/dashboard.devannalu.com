"use client";

import { healthCheckSchema, type HealthCheck } from "@studio/contracts";
import { useEffect, useState } from "react";

type State = { kind: "loading" } | { kind: "ok"; data: HealthCheck } | { kind: "error"; message: string };

const CHECK_LABEL: Record<string, string> = { api: "API", database: "Banco de dados", storage: "Armazenamento de arquivos" };
const VALUE_LABEL = { ok: "funcionando", down: "fora do ar", skipped: "ainda não ligado" } as const;

/** Mostra o estado real da API (sem dados de exemplo). */
export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort("timeout"), 20_000);
    fetch("/api/health/ready", { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`A API respondeu com status ${r.status}.`);
        setState({ kind: "ok", data: healthCheckSchema.parse(await r.json()) });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted && ctrl.signal.reason !== "timeout") return; // componente desmontado
        const message =
          ctrl.signal.reason === "timeout"
            ? "A API demorou demais para responder. Tente recarregar a página."
            : e instanceof Error && e.message.startsWith("A API")
              ? e.message
              : "Não foi possível falar com a API agora.";
        setState({ kind: "error", message });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      ctrl.abort("unmount");
    };
  }, []);

  if (state.kind === "loading") return <p className="text-text-2" aria-live="polite">Verificando a API…</p>;
  if (state.kind === "error") return <p className="font-semibold text-danger" role="alert">{state.message}</p>;
  return (
    <ul className="grid gap-2" aria-label="Estado dos serviços">
      {Object.entries(state.data.checks).map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-4 border-t border-line pt-2 first:border-0 first:pt-0">
          <span className="font-semibold">{CHECK_LABEL[k] ?? k}</span>
          <span className={v === "ok" ? "text-success" : v === "down" ? "text-danger" : "text-text-2"}>● {VALUE_LABEL[v]}</span>
        </li>
      ))}
    </ul>
  );
}
