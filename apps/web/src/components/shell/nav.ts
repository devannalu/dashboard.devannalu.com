import { BarChart3, CalendarDays, CheckSquare, FileText, FolderKanban, FolderOpen, House, Lightbulb, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Módulo ainda não implementado: aparece desabilitado com "em breve" (nada de link quebrado). */
  soon?: boolean;
}

/** Navegação principal (docs/02-arquitetura-informacao.md §1). */
export const NAV: NavItem[] = [
  { href: "/", label: "Início", icon: House },
  { href: "/projetos", label: "Projetos", icon: FolderKanban, soon: true },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare, soon: true },
  { href: "/calendario", label: "Calendário", icon: CalendarDays, soon: true },
  { href: "/notas", label: "Notas", icon: FileText, soon: true },
  { href: "/ideias", label: "Idea Lab", icon: Lightbulb, soon: true },
  { href: "/arquivos", label: "Arquivos", icon: FolderOpen, soon: true },
  { href: "/clientes", label: "Clientes", icon: Users, soon: true },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, soon: true },
];
