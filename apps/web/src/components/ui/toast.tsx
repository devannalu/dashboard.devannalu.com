"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

const ToastCtx = createContext<((message: string, action?: ToastItem["action"]) => void) | null>(null);

/** Avisos discretos no canto (com "Desfazer" quando a ação é reversível), anunciados a leitores de tela. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((message: string, action?: ToastItem["action"]) => {
    const id = ++seq.current;
    setItems((list) => [...list.slice(-2), { id, message, action }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), action ? 6000 : 3500);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed right-4 bottom-4 z-[60] grid max-w-[calc(100vw-32px)] gap-2">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-glass">
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="rounded-md px-2 py-0.5 underline underline-offset-2 hover:bg-white/15"
                onClick={() => {
                  t.action?.onClick();
                  setItems((list) => list.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}
