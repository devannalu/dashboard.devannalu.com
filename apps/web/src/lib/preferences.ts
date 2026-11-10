"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferências de interface guardadas neste navegador (menu recolhido, colagem…).
 * Quando o perfil existir (E19), elas passam a ser salvas no banco e sincronizadas.
 */
const EVENT = "studio:preferencia";

function read<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

export function usePreference<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const subscribe = useCallback((cb: () => void) => {
    const onEvent = (e: Event) => {
      if (!(e instanceof CustomEvent) || e.detail === key) cb();
    };
    window.addEventListener(EVENT, onEvent);
    window.addEventListener("storage", cb);
    return () => {
      window.removeEventListener(EVENT, onEvent);
      window.removeEventListener("storage", cb);
    };
  }, [key]);
  const value = useSyncExternalStore(subscribe, () => read(key, fallback, allowed), () => fallback);
  const set = useCallback(
    (v: T) => {
      try {
        localStorage.setItem(key, v);
      } catch {
        /* sem armazenamento: vale só nesta visita */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );
  return [value, set];
}

export const COLAGEM = ["off", "sutil", "presente", "total"] as const;
export type Colagem = (typeof COLAGEM)[number];
export const MENU = ["aberto", "recolhido"] as const;
export type Menu = (typeof MENU)[number];
