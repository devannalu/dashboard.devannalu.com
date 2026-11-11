"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";

export interface DataState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Recarrega do servidor (depois de criar/alterar algo). */
  reload: () => Promise<void>;
  /** Atualização otimista local (a tela muda na hora; chame `reload` se a API falhar). */
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

interface Result<T> {
  /** Caminho a que estes dados se referem (enquanto difere do atual, está carregando). */
  path: string | null;
  data: T | undefined;
  error: string | null;
}

/**
 * Busca dados da API e recarrega quando o caminho muda. `null` = não buscar ainda.
 * Ao trocar de filtro, mantém os dados anteriores na tela até chegarem os novos.
 */
export function useData<T>(path: string | null): DataState<T> {
  const [result, setResult] = useState<Result<T>>({ path: null, data: undefined, error: null });

  const fetchInto = useCallback(
    (signal?: AbortSignal) => {
      if (!path) return Promise.resolve();
      return api<T>(path, { signal }).then(
        (data) => setResult({ path, data, error: null }),
        (e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setResult((prev) => ({ path, data: prev.data, error: errorMessage(e) }));
        },
      );
    },
    [path],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchInto(ctrl.signal);
    // Recarrega quando qualquer tela cria/altera algo (aviso disparado pelo cliente da API)
    // e quando a janela volta ao foco (o Next mantém páginas já visitadas em memória).
    let last = Date.now();
    const onChange = () => {
      last = Date.now();
      void fetchInto();
    };
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 5000) onChange();
    };
    window.addEventListener("dados-alterados", onChange);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      ctrl.abort();
      window.removeEventListener("dados-alterados", onChange);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchInto]);

  return {
    data: result.data,
    error: result.error,
    loading: path !== null && result.path !== path,
    reload: () => fetchInto(),
    setData: (updater) => setResult((prev) => ({ ...prev, data: updater(prev.data) })),
  };
}

/** Lista no formato `{ data: [...] }` da API. */
export function useList<T>(path: string | null) {
  const state = useData<{ data: T[] }>(path);
  return { ...state, items: state.data?.data ?? [] };
}
