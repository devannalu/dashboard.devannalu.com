"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

/**
 * Lê um parâmetro da URL (ex.: `?abrir=<id>` vindo da busca, `?novo=1`).
 * Evita `useSearchParams`, que exigiria Suspense em toda página. No servidor, é sempre `null`.
 */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/**
 * Item aberto num painel, começando pelo `?abrir=<id>` da URL (quando a lista carregar).
 * Depois que a usuária abre/fecha algo, vale a escolha dela.
 */
export function useUrlSelection<T extends { id: string }, Extra = never>(items: T[]): [T | Extra | null, (v: T | Extra | null) => void] {
  const abrir = useQueryParam("abrir");
  const [chosen, setChosen] = useState<{ v: T | Extra | null } | null>(null);
  const fromUrl = abrir ? (items.find((i) => i.id === abrir) ?? null) : null;
  return [chosen ? chosen.v : fromUrl, (v) => setChosen({ v })];
}
