"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { COLAGEM, MENU, usePreference } from "@/lib/preferences";
import { cn } from "@/lib/cn";
import { ToastProvider } from "../ui/toast";
import { Collage } from "./collage";
import { NAV } from "./nav";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Estrutura das telas autenticadas: colagem ao fundo, menu bordô, barra superior e conteúdo. */
export function AppShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = usePreference("menu", "aberto", MENU);
  const [colagem, setColagem] = usePreference("colagem", "presente", COLAGEM);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const title = NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.label ?? "Studio OS";

  // Esc fecha a gaveta no celular.
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <ToastProvider>
      <a href="#conteudo" className="sr-only z-[70] rounded-xl bg-accent px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <Collage level={colagem} />
      <div className={cn("relative z-10 grid min-h-screen grid-cols-1", menu === "recolhido" ? "lg:grid-cols-[84px_minmax(0,1fr)]" : "lg:grid-cols-[256px_minmax(0,1fr)]")}>
        <Sidebar collapsed={menu === "recolhido"} onToggleCollapsed={() => setMenu(menu === "recolhido" ? "aberto" : "recolhido")} drawerOpen={drawer} onNavigate={() => setDrawer(false)} />
        {drawer && <div aria-hidden className="fixed inset-0 z-20 bg-black/45 lg:hidden" onClick={() => setDrawer(false)} />}
        <div className="min-w-0">
          <Topbar title={title} colagem={colagem} onColagem={setColagem} onOpenDrawer={() => setDrawer(true)} drawerOpen={drawer} />
          <main id="conteudo" tabIndex={-1} className="mx-auto grid max-w-[1480px] gap-5 px-4 py-6 focus:outline-none sm:px-7 sm:py-7">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
