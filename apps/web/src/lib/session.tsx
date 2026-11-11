"use client";

import type { Me } from "@studio/contracts";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";

interface SessionValue {
  me: Me;
  workspaceId: string;
  /** Monta o caminho da API dentro do workspace atual: `ws("/tasks")` → `/api/workspaces/{id}/tasks`. */
  ws: (path: string) => string;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionCtx = createContext<SessionValue | null>(null);

/**
 * Garante sessão nas telas do app: sem sessão → /entrar (ou /configuracao-inicial se ainda não houver conta).
 * A proteção de verdade é a API (toda rota exige sessão); isto só decide o que mostrar.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const load = useCallback(
    () =>
      api<Me>("/api/auth/me").then(setMe, async (e: unknown) => {
        if (e instanceof ApiError && e.status === 401) {
          const setup = await fetch("/api/auth/setup", { cache: "no-store" }).catch(() => null);
          const next = pathname && pathname !== "/" ? `?voltar=${encodeURIComponent(pathname)}` : "";
          router.replace(setup?.ok ? "/configuracao-inicial" : `/entrar${next}`);
          return;
        }
        setFailed(e instanceof ApiError ? e.message : "Não foi possível carregar sua sessão.");
      }),
    [router, pathname],
  );

  useEffect(() => {
    void load();
    // Carrega só uma vez por montagem do layout; trocas de página reaproveitam a sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onExpired = () => router.replace("/entrar");
    window.addEventListener("sessao-expirada", onExpired);
    return () => window.removeEventListener("sessao-expirada", onExpired);
  }, [router]);

  if (failed) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="glass max-w-md rounded-[22px] p-6">
          <p className="font-bold">{failed}</p>
          <button type="button" className="mt-4 font-bold text-accent-text underline" onClick={() => location.reload()}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="grid min-h-screen place-items-center" aria-live="polite">
        <p className="label-mono">Carregando…</p>
      </div>
    );
  }
  const workspace = me.workspaces[0];
  if (!workspace) return <p className="p-6">Sua conta não tem nenhum workspace.</p>;

  const value: SessionValue = {
    me,
    workspaceId: workspace.id,
    ws: (path) => `/api/workspaces/${workspace.id}${path}`,
    logout: async () => {
      await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      router.replace("/entrar");
    },
    refresh: load,
  };
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return ctx;
}
