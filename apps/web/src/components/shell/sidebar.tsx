"use client";

import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV } from "./nav";

/**
 * Menu lateral bordô (D-21). Recolhido mostra só ícones; no celular vira gaveta.
 * `collapsed` vale para telas grandes; `drawerOpen` para telas pequenas.
 */
export function Sidebar({ collapsed, onToggleCollapsed, drawerOpen, onNavigate }: { collapsed: boolean; onToggleCollapsed: () => void; drawerOpen: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  return (
    <aside
      id="menu-principal"
      aria-label="Menu principal"
      data-collapsed={collapsed || undefined}
      className={cn(
        "group/side z-30 flex flex-col gap-6 overflow-hidden bg-sidebar px-3 py-4 text-sidebar-text shadow-[4px_0_24px_rgba(40,10,14,0.18)]",
        // celular: gaveta fixa que desliza
        "fixed inset-y-0 left-0 w-[272px] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:transition-[width]",
        drawerOpen ? "translate-x-0" : "-translate-x-full",
        collapsed ? "lg:w-[76px]" : "lg:w-[252px]",
      )}
    >
      <div className={cn("flex min-h-12 items-center gap-2", collapsed && "lg:flex-col")}>
        <Link href="/" onClick={onNavigate} aria-label="Annalu Studio OS, ir para o início" className={cn("flex min-w-0 flex-1 items-center gap-2.5 pl-1", collapsed && "lg:justify-center lg:pl-0")}>
          <Image src="/brand/cereja-8.png" alt="" width={40} height={55} className="h-auto w-10 shrink-0 drop-shadow" priority />
          <span className={cn("min-w-0 leading-none", collapsed && "lg:hidden")}>
            <span className="block font-script text-[38px] leading-[0.8] whitespace-nowrap">Annalu</span>
            <span className="block font-display text-[13px] font-black tracking-tight lowercase opacity-90">studio os</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="menu-principal"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="hidden size-9 shrink-0 items-center justify-center rounded-[10px] hover:bg-white/10 focus-visible:outline-sidebar-text lg:inline-flex"
        >
          <ChevronLeft aria-hidden className={cn("size-[18px] transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav aria-label="Seções">
        <ul className="grid gap-0.5">
          {NAV.map(({ href, label, icon: Icon, soon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const base = cn("flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium whitespace-nowrap", collapsed && "lg:justify-center lg:px-0");
            if (soon) {
              return (
                <li key={href}>
                  <span aria-disabled="true" title={`${label} — em breve`} className={cn(base, "cursor-not-allowed opacity-45")}>
                    <Icon aria-hidden className="size-[18px] shrink-0" />
                    <span className={cn(collapsed && "lg:sr-only")}>{label}</span>
                    <span className={cn("ml-auto font-mono text-[10px] uppercase tracking-wider opacity-80", collapsed && "lg:hidden")}>em breve</span>
                  </span>
                </li>
              );
            }
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={label}
                  className={cn(base, "opacity-85 hover:bg-white/10 hover:opacity-100 focus-visible:outline-sidebar-text", active && "bg-white/[0.17] font-bold opacity-100")}
                >
                  <Icon aria-hidden className="size-[18px] shrink-0" />
                  <span className={cn(collapsed && "lg:sr-only")}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("mt-auto px-3 font-mono text-[10px] uppercase tracking-widest opacity-60", collapsed && "lg:hidden")}>M1 · fundação</div>
    </aside>
  );
}
