import type { ReactNode, SVGProps } from "react";

/**
 * Ícones próprios do Studio OS (Cherry Atelier): traço arredondado + preenchimento suave (duotone),
 * sempre em `currentColor` — herdam a cor do token do contexto (menu bordô, item ativo etc.).
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {children}
    </svg>
  );
}

/** Camada de preenchimento suave do duotone. */
const soft = { fill: "currentColor", fillOpacity: 0.22, stroke: "none" } as const;

export function IconHome(p: IconProps) {
  return (
    <Icon {...p}>
      <path {...soft} d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
      <path d="M3 11 12 3.8 21 11" />
      <path d="M5 9.6V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V9.6" />
      {/* porta em coração */}
      <path d="M12 18.2s-2.6-1.6-2.6-3.3a1.4 1.4 0 0 1 2.6-.8 1.4 1.4 0 0 1 2.6.8c0 1.7-2.6 3.3-2.6 3.3z" />
    </Icon>
  );
}

export function IconProjects(p: IconProps) {
  return (
    <Icon {...p}>
      <path {...soft} d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2h8.8A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.2l2 2h8.8A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      {/* estrela */}
      <path d="m12 10.6.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z" />
    </Icon>
  );
}

export function IconTasks(p: IconProps) {
  return (
    <Icon {...p}>
      {/* check de cereja (D-23) */}
      <circle {...soft} cx="12" cy="14.5" r="6.5" />
      <circle cx="12" cy="14.5" r="6.5" />
      <path d="M12 8c0-2.4 1.3-4.1 3.6-4.8" />
      <path d="M15.6 3.2c1.6.1 2.6.9 3 2.2-1.6.2-2.6-.4-3-2.2z" />
      <path d="m9.2 14.6 1.9 1.9 3.8-3.9" />
    </Icon>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Icon {...p}>
      <rect {...soft} x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M12 17.6s-2.2-1.3-2.2-2.8a1.2 1.2 0 0 1 2.2-.7 1.2 1.2 0 0 1 2.2.7c0 1.5-2.2 2.8-2.2 2.8z" />
    </Icon>
  );
}

export function IconNotes(p: IconProps) {
  return (
    <Icon {...p}>
      <path {...soft} d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5z" />
      <path d="M14.5 3.5H6.5A1.5 1.5 0 0 0 5 5v14a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8z" />
      <path d="M14.5 3.5V8H19M8.5 12.5h7M8.5 16h4.5" />
    </Icon>
  );
}

export function IconIdeas(p: IconProps) {
  return (
    <Icon {...p}>
      <path {...soft} d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z" />
      <path d="M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z" />
      <path d="M9.8 20.5h4.4" />
      {/* brilho */}
      <path d="M20 2.8v2.4M18.8 4h2.4" />
    </Icon>
  );
}

export function IconFiles(p: IconProps) {
  return (
    <Icon {...p}>
      <rect {...soft} x="7" y="3.5" width="13" height="15" rx="2" />
      <rect x="7" y="3.5" width="13" height="15" rx="2" />
      <path d="M4 7v11.5A2 2 0 0 0 6 20.5h10" />
      <path d="M10.5 9h6M10.5 12.5h4" />
    </Icon>
  );
}

export function IconClients(p: IconProps) {
  return (
    <Icon {...p}>
      <circle {...soft} cx="9" cy="8.5" r="3.5" />
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5.2a3.3 3.3 0 0 1 0 6.6M18.2 14.6a5.8 5.8 0 0 1 3 4.9" />
    </Icon>
  );
}

export function IconReports(p: IconProps) {
  return (
    <Icon {...p}>
      <rect {...soft} x="4" y="12" width="4" height="8" rx="1.2" />
      <rect {...soft} x="10" y="8" width="4" height="12" rx="1.2" />
      <rect {...soft} x="16" y="4" width="4" height="16" rx="1.2" />
      <rect x="4" y="12" width="4" height="8" rx="1.2" />
      <rect x="10" y="8" width="4" height="12" rx="1.2" />
      <rect x="16" y="4" width="4" height="16" rx="1.2" />
    </Icon>
  );
}

/** Estrela decorativa (adesivo) para o rodapé do menu. */
export function StarSticker(p: IconProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden {...p}>
      <path
        d="M50 4 61 36l34 1-27 21 10 33-28-19-28 19 10-33L5 37l34-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
