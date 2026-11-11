import type { Colagem } from "@/lib/preferences";
import { cn } from "@/lib/cn";

/** Posições fixas dos adesivos (D-13): sem aleatoriedade, layout previsível. */
const STICKERS: { src: string; w: number; r: number; pos: string; mobile?: boolean }[] = [
  { src: "loser", w: 330, r: -6, pos: "top-[9%] left-[20%]", mobile: true },
  { src: "estrelas-trilha", w: 250, r: -16, pos: "-top-[6%] left-[41%]" },
  { src: "lirio", w: 270, r: -8, pos: "top-[2%] left-[60%]", mobile: true },
  { src: "boneco-capuz", w: 290, r: 8, pos: "top-[6%] right-[1%]", mobile: true },
  { src: "kanji-textura", w: 300, r: 6, pos: "top-[30%] left-[16%]", mobile: true },
  { src: "cereja-8", w: 200, r: -12, pos: "top-[24%] left-[44%]" },
  { src: "tribal-coracao", w: 200, r: 9, pos: "top-[28%] right-[21%]" },
  { src: "espiral", w: 200, r: 14, pos: "top-[46%] left-[2%]" },
  { src: "olhos", w: 300, r: -10, pos: "top-[60%] left-[23%]", mobile: true },
  { src: "estrela", w: 280, r: -14, pos: "top-[52%] left-[50%]" },
  { src: "silhueta", w: 220, r: 18, pos: "top-[56%] right-[24%]" },
  { src: "estrela-espiral", w: 250, r: 14, pos: "bottom-[3%] left-[42%]", mobile: true },
  { src: "cerejas-laco", w: 300, r: -9, pos: "-bottom-[2%] left-[12%]", mobile: true },
  { src: "leopardo", w: 330, r: -7, pos: "-bottom-[5%] right-[3%]", mobile: true },
];

const OPACITY: Record<Colagem, number> = { off: 0, sutil: 0.4, presente: 0.85, total: 1 };

/** Parede de adesivos ao fundo, atrás dos cards de vidro. Puramente decorativa (aria-hidden). */
export function Collage({ level }: { level: Colagem }) {
  if (level === "off") return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ opacity: OPACITY[level] }}>
      {STICKERS.map((s) => (
        // eslint-disable-next-line @next/next/no-img-element -- decorativo, já otimizado em WebP; next/image não traz ganho aqui
        <img
          key={s.src}
          src={`/stickers/${s.src}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("absolute h-auto drop-shadow-[3px_6px_8px_rgba(40,10,14,0.25)]", s.pos, !s.mobile && "max-sm:hidden")}
          style={{ width: `calc(${s.w} * var(--sticker-unit, 1px))`, transform: `rotate(${s.r}deg)` }}
        />
      ))}
      <div className="grain absolute inset-0" />
    </div>
  );
}
