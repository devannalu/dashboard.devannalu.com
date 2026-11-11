import type { ComponentType, SVGProps } from "react";
import { IconCalendar, IconClients, IconFiles, IconHome, IconIdeas, IconNotes, IconProjects, IconReports, IconTasks } from "./nav-icons";

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  group: "dia" | "criacao" | "negocio";
}

export const NAV_GROUPS: { id: NavItem["group"]; label: string }[] = [
  { id: "dia", label: "Seu dia" },
  { id: "criacao", label: "Criação" },
  { id: "negocio", label: "Negócio" },
];

/** Navegação principal (docs/02-arquitetura-informacao.md §1), agrupada por uso. */
export const NAV: NavItem[] = [
  { href: "/", label: "Início", icon: IconHome, group: "dia" },
  { href: "/tarefas", label: "Tarefas", icon: IconTasks, group: "dia" },
  { href: "/calendario", label: "Calendário", icon: IconCalendar, group: "dia" },
  { href: "/projetos", label: "Projetos", icon: IconProjects, group: "criacao" },
  { href: "/notas", label: "Notas", icon: IconNotes, group: "criacao" },
  { href: "/ideias", label: "Idea Lab", icon: IconIdeas, group: "criacao" },
  { href: "/arquivos", label: "Arquivos", icon: IconFiles, group: "criacao" },
  { href: "/clientes", label: "Clientes", icon: IconClients, group: "negocio" },
  { href: "/relatorios", label: "Relatórios", icon: IconReports, group: "negocio" },
];
