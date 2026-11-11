import type { Colagem } from "@/lib/preferences";
import { cn } from "@/lib/cn";

/**
 * Adesivos em posições fixas (D-13), sem aleatoriedade. Cada adesivo ocupa a própria célula de uma
 * grade (5×3 no desktop, 4×4 no tablet, 3×3 no celular) e nunca passa do espaço dela: assim eles não
 * se sobrepõem em nenhuma proporção de tela. `s` = escala relativa dentro da célula; `x`/`y` = leve
 * deslocamento (em % da célula) e `r` = rotação, para manter a cara de colagem.
 */
const STICKERS: { src: string; s: number; r: number; x: number; y: number; mobile?: boolean }[] = [
  { src: "loser", s: 1, r: -6, x: 6, y: 4, mobile: true },
  { src: "estrelas-trilha", s: 0.85, r: -16, x: -4, y: -10 },
  { src: "lirio", s: 0.95, r: -8, x: 0, y: -4, mobile: true },
  { src: "tribal-coracao", s: 0.8, r: 9, x: 6, y: 8 },
  { src: "boneco-capuz", s: 1, r: 8, x: 4, y: 0, mobile: true },
  { src: "espiral", s: 0.8, r: 14, x: -8, y: 6 },
  { src: "kanji-textura", s: 1, r: 6, x: 6, y: -2, mobile: true },
  { src: "cereja-8", s: 0.75, r: -12, x: 0, y: 6 },
  { src: "silhueta", s: 0.85, r: 18, x: -4, y: 4 },
  { src: "estrela", s: 0.95, r: -14, x: 6, y: -4 },
  { src: "cerejas-laco", s: 1, r: -9, x: -2, y: 6, mobile: true },
  { src: "olhos", s: 1, r: -10, x: 8, y: 0, mobile: true },
  { src: "estrela-espiral", s: 0.9, r: 14, x: 0, y: 8, mobile: true },
  { src: "kanji-amor", s: 0.8, r: -6, x: -6, y: 2 },
  { src: "leopardo", s: 1, r: -7, x: 4, y: 6, mobile: true },
];

const OPACITY: Record<Colagem, number> = { off: 0, sutil: 0.4, presente: 0.85, total: 1 };

/** Parede de adesivos ao fundo, atrás dos cards de vidro. Puramente decorativa (aria-hidden). */
export function Collage({ level }: { level: Colagem }) {
  if (level === "off") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ opacity: OPACITY[level] }}>
      <div className="grid h-full grid-cols-3 grid-rows-3 p-2 sm:grid-cols-4 sm:grid-rows-4 lg:grid-cols-5 lg:grid-rows-3">
        {STICKERS.map((st) => (
          <div key={st.src} className={cn("relative grid min-h-0 min-w-0 place-items-center", !st.mobile && "max-sm:hidden")}>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorativo, já otimizado em WebP; next/image não traz ganho aqui */}
            <img
              src={`/stickers/${st.src}.webp`}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-auto w-auto object-contain drop-shadow-[3px_6px_8px_rgba(40,10,14,0.25)]"
              style={{
                // Margem de folga para a rotação não invadir a célula vizinha.
                maxWidth: `${Math.round(76 * st.s)}%`,
                maxHeight: `${Math.round(72 * st.s)}%`,
                transform: `translate(${st.x}%, ${st.y}%) rotate(${st.r}deg)`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="grain absolute inset-0" />
    </div>
  );
}
