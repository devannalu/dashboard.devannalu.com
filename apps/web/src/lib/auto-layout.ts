import type { WidgetId, WidgetSize } from "@studio/contracts";

/** Colunas ocupadas por tamanho na grade de 12 colunas do desktop. */
export const COLS: Record<WidgetSize, number> = { sm: 4, md: 6, lg: 8, full: 12 };

/** Tamanho que cada widget costuma pedir (usado nas variações do "Organizar sozinho"). */
export const NATURAL_SIZE: Record<WidgetId, WidgetSize> = {
  atividade: "full",
  projetos: "lg",
  hoje: "md",
  calendario: "md",
  kpi7: "sm",
  agora: "sm",
  captura: "sm",
  notas: "sm",
  pet: "md",
};

interface Item {
  id: WidgetId;
  size: WidgetSize;
}

/**
 * Organiza os widgets em linhas completas de 12 colunas, sem buracos.
 * Cada linha é uma destas combinações: 12 · 8+4 · 6+6 · 4+4+4.
 * Respeita a ordem e o tamanho pedido sempre que possível; quando não dá,
 * puxa um parceiro de mais adiante na lista ou ajusta o tamanho para fechar a linha.
 */
export function packRows(items: Item[]): Item[] {
  const queue = [...items];
  const out: Item[] = [];
  const take = (pred: (it: Item) => boolean): Item | undefined => {
    const i = queue.findIndex(pred);
    return i === -1 ? undefined : queue.splice(i, 1)[0];
  };

  while (queue.length > 0) {
    const w = queue.shift()!;
    if (w.size === "full") {
      out.push(w);
    } else if (w.size === "lg") {
      const p = take((it) => it.size === "sm") ?? take(() => true);
      out.push(...(p ? [{ id: w.id, size: "lg" as const }, { id: p.id, size: "sm" as const }] : [{ id: w.id, size: "full" as const }]));
    } else if (w.size === "md") {
      const p = take((it) => it.size === "md") ?? take(() => true);
      out.push(...(p ? [{ id: w.id, size: "md" as const }, { id: p.id, size: "md" as const }] : [{ id: w.id, size: "full" as const }]));
    } else {
      const a = take((it) => it.size === "sm");
      const b = a ? take((it) => it.size === "sm") : undefined;
      if (a && b) out.push(w, { id: a.id, size: "sm" }, { id: b.id, size: "sm" });
      else {
        const p = a ?? take(() => true);
        if (!p) out.push({ id: w.id, size: "full" });
        else if (queue.length > 0) {
          // Ainda há widgets: completa a linha com três pequenos.
          const c = queue.shift()!;
          out.push(w, { id: p.id, size: "sm" }, { id: c.id, size: "sm" });
        } else out.push({ id: w.id, size: "sm" }, { id: p.id, size: "lg" });
      }
    }
  }
  return out;
}

/**
 * Disposição automática. A variação 0 mantém ordem e tamanhos escolhidos (só fecha os buracos);
 * as seguintes giram a ordem e usam o tamanho natural de cada widget, para mostrar outras opções.
 */
export function autoArrange(items: Item[], variant: number): Item[] {
  if (variant === 0 || items.length === 0) return packRows(items);
  const k = variant % items.length;
  const rotated = [...items.slice(k), ...items.slice(0, k)];
  return packRows(rotated.map((it) => ({ id: it.id, size: NATURAL_SIZE[it.id] })));
}
