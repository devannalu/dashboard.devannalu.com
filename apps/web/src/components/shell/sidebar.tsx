"use client";

import { ChevronsLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { NAV, NAV_GROUPS } from "./nav";
import { StarSticker } from "./nav-icons";

/**
 * Menu lateral bordô (D-21), versão "adesivo": grupos, ícones duotone próprios em pastilhas,
 * item ativo como etiqueta clara, textura de papel e estrela decorativa. Recolhido mostra só ícones;
 * no celular vira gaveta. Sem gradientes (design system).
 */
export function Sidebar({ collapsed, onToggleCollapsed, drawerOpen, onNavigate }: { collapsed: boolean; onToggleCollapsed: () => void; drawerOpen: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const { me } = useSession();
  const initial = me.user.name.trim().slice(0, 1).toUpperCase() || "A";

  return (
    <aside
      id="menu-principal"
      aria-label="Menu principal"
      data-collapsed={collapsed || undefined}
      className={cn(
        "z-30 flex flex-col overflow-hidden bg-sidebar text-sidebar-text shadow-[4px_0_24px_rgba(40,10,14,0.22)]",
        "fixed inset-y-0 left-0 w-[272px] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]",
        drawerOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "lg:w-[84px]" : "lg:w-[256px]",
      )}
    >
      {/* textura de papel + estrela de adesivo (decorativas) */}
      <div aria-hidden className="grain pointer-events-none absolute inset-0 mix-blend-overlay" />
      <StarSticker className={cn("pointer-events-none absolute -right-10 bottom-24 size-44 rotate-12 text-sidebar-text opacity-[0.07]", collapsed && "lg:hidden")} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10" />

      {/* marca */}
      <Link
        href="/"
        onClick={onNavigate}
        aria-label="Annalu Studio OS, ir para o início"
        className={cn("relative mx-3 mt-4 mb-5 flex min-h-14 items-center gap-2.5 rounded-2xl px-2 py-1 hover:bg-white/[0.06]", collapsed && "lg:justify-center lg:px-0")}
      >
        <Image src="/brand/cereja-8.png" alt="" width={40} height={55} className="h-auto w-10 shrink-0 -rotate-6 drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)] transition-transform hover:rotate-6" priority />
        <span className={cn("min-w-0 leading-none", collapsed && "lg:hidden")}>
          <span className="block font-script text-[40px] leading-[0.8] whitespace-nowrap">Annalu</span>
          <span className="mt-1 inline-block rounded-md bg-sidebar-text px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-[0.18em] text-sidebar uppercase">studio os</span>
        </span>
      </Link>

      <nav aria-label="Seções" className="relative flex-1 overflow-y-auto px-3">
        {NAV_GROUPS.map((g) => (
          <div key={g.id} className="mb-4">
            <p className={cn("mb-1.5 px-3 font-mono text-[10px] font-bold tracking-[0.16em] uppercase opacity-55", collapsed && "lg:sr-only")}>{g.label}</p>
            {collapsed && <div aria-hidden className="mx-auto mb-1.5 hidden h-px w-8 bg-white/15 lg:block" />}
            <ul className="grid gap-1">
              {NAV.filter((n) => n.group === g.id).map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={label}
                      className={cn(
                        "group/item relative flex items-center gap-3 rounded-2xl p-1.5 pr-3 text-sm font-semibold whitespace-nowrap transition-all focus-visible:outline-sidebar-text",
                        collapsed && "lg:justify-center lg:pr-1.5",
                        active ? "bg-sidebar-text text-sidebar shadow-[0_4px_14px_rgba(0,0,0,0.25)]" : "opacity-85 hover:bg-white/10 hover:opacity-100",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-xl transition-transform group-hover/item:-rotate-6",
                          active ? "bg-sidebar text-sidebar-text" : "bg-white/[0.08]",
                        )}
                      >
                        <Icon className="size-[20px]" />
                      </span>
                      <span className={cn(collapsed && "lg:sr-only")}>{label}</span>
                      {active && (
                        <span aria-hidden className={cn("ml-auto font-script text-2xl leading-none", collapsed && "lg:hidden")}>
                          ♥
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* rodapé: conta + recolher */}
      <div className="relative grid gap-2 border-t border-white/10 p-3">
        <div className={cn("flex items-center gap-2.5 rounded-2xl bg-white/[0.07] p-2", collapsed && "lg:justify-center lg:bg-transparent lg:p-0")}>
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-text font-display text-base font-black text-sidebar">
            {initial}
          </span>
          <span className={cn("min-w-0 leading-tight", collapsed && "lg:hidden")}>
            <b className="block truncate text-sm">{me.user.name}</b>
            <span className="block truncate text-[11px] opacity-70">{me.workspaces[0]?.name}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="menu-principal"
          className={cn("hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold opacity-70 hover:bg-white/10 hover:opacity-100 focus-visible:outline-sidebar-text lg:flex", collapsed && "lg:justify-center lg:px-0")}
        >
          <ChevronsLeft aria-hidden className={cn("size-4 shrink-0 transition-transform", collapsed && "rotate-180")} />
          <span className={cn(collapsed && "lg:sr-only")}>{collapsed ? "Expandir menu" : "Recolher menu"}</span>
        </button>
      </div>
    </aside>
  );
}
