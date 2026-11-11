"use client";

import { PET_FOODS, petFoodSchema, petMoodLabel, type PetDto, type PetFood } from "@studio/contracts";
import { Heart, Pencil } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session";
import { useData } from "@/lib/use-data";
import { Button, IconButton } from "../ui/button";
import { Card, CardHeader, Skeleton } from "../ui/display";
import { Input } from "../ui/field";
import { useToast } from "../ui/toast";
import { LoadError } from "./common";

const FOODS = petFoodSchema.options;
/** Versão no endereço: ao trocar a arte, mude o `v` para o navegador não mostrar a imagem antiga do cache. */
const PET_IMAGE = "/pet/tranquila.webp?v=original-1";

function Meter({ label, value, max = 100, suffix }: { label: string; value: number; max?: number; suffix?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)_44px] items-center gap-3 text-sm">
      <span>{label}</span>
      <span role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 overflow-hidden rounded-full bg-line">
        <span className="block h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right font-mono text-xs text-text-2">{suffix ?? value}</span>
    </div>
  );
}

/**
 * Pet tamagotchi do Início (D-25, D-27, D-42). Por enquanto sempre com a expressão padrão (D-41);
 * o humor já é calculado e aparece no texto. Nunca morre: sem comer, fica "fraquinha" e dormindo.
 */
export function PetCard() {
  const { ws } = useSession();
  const toast = useToast();
  const pet = useData<PetDto>(ws("/pet"));
  const [busy, setBusy] = useState(false);
  const [jump, setJump] = useState(0);
  const [hearts, setHearts] = useState<number[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const announced = useRef<string>("");

  // Avisa quando chegam comidas novas (ganhas com tarefas, ideias, marcos e projetos).
  const awardKey = (pet.data?.newAwards ?? []).join(",");
  useEffect(() => {
    if (!awardKey || announced.current === awardKey) return;
    announced.current = awardKey;
    const counts = awardKey.split(",").reduce<Record<string, number>>((m, f) => ({ ...m, [f]: (m[f] ?? 0) + 1 }), {});
    toast(`Você ganhou: ${Object.entries(counts).map(([f, n]) => `${n} ${PET_FOODS[f as PetFood].label.toLowerCase()}`).join(", ")}`);
  }, [awardKey, toast]);

  async function act(path: string, body?: unknown, after?: () => void) {
    setBusy(true);
    try {
      const next = await api<PetDto>(ws(path), { method: path === "/pet" ? "PATCH" : "POST", body });
      pet.setData(() => next);
      after?.();
    } catch (e) {
      toast(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function feed(food: PetFood) {
    void act("/pet/alimentar", { food }, () => {
      setJump((n) => n + 1);
      toast(`${pet.data?.name ?? "Pet"} comeu ${PET_FOODS[food].label.toLowerCase()} (+${PET_FOODS[food].satiety} saciedade)`);
    });
  }

  function cuddle() {
    const id = Date.now();
    setHearts((h) => [...h, id]);
    setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 1200);
    void act("/pet/carinho");
  }

  function rename(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    void act("/pet", { name: name.trim() }, () => setEditing(false));
  }

  const d = pet.data;
  const weak = d?.mood === "fraquinha";
  return (
    <Card aria-labelledby="h-pet" className="h-full">
      <CardHeader id="h-pet" title="Seu pet" />
      {pet.error && <LoadError message={pet.error} onRetry={pet.reload} />}
      {!d && !pet.error && <Skeleton className="h-56" />}
      {d && (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
          <button
            type="button"
            onClick={cuddle}
            aria-label={`Fazer carinho em ${d.name}. ${d.name} está ${petMoodLabel[d.mood]}.`}
            className="relative mx-auto h-64 w-full max-w-[200px] overflow-hidden rounded-2xl bg-accent-soft"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- arte do pet já otimizada em WebP */}
            <img
              key={jump}
              src={PET_IMAGE}
              alt=""
              className={cn("pet-breathe h-full w-full object-cover object-top", jump > 0 && "pet-jump", weak && "opacity-70 grayscale-[40%]")}
            />
            {weak && <span className="absolute top-3 right-3 font-mono text-sm font-bold text-text-2">z z z</span>}
            {hearts.map((h) => (
              <Heart key={h} aria-hidden className="pet-heart absolute bottom-16 left-1/2 size-6 fill-accent text-accent" />
            ))}
          </button>

          <div className="grid content-start gap-3">
            {editing ? (
              <form onSubmit={rename} className="flex gap-2">
                <Input aria-label="Nome do pet" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
                <Button type="submit" size="sm" loading={busy}>
                  Salvar
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-script text-5xl leading-none text-accent-text">{d.name}</h3>
                <IconButton
                  variant="ghost"
                  className="size-8"
                  label="Mudar o nome do pet"
                  onClick={() => {
                    setName(d.name);
                    setEditing(true);
                  }}
                >
                  <Pencil aria-hidden />
                </IconButton>
              </div>
            )}
            <p className="label-mono">{petMoodLabel[d.mood]}</p>
            <div className="grid gap-2">
              <Meter label="Saciedade" value={d.satiety} />
              <Meter label="Humor" value={d.humor} />
              <Meter label="Nível" value={d.xpInLevel} max={10} suffix={`nv ${d.level}`} />
            </div>
            <p className="text-xs text-text-2">
              {d.streak > 0 ? `Sequência: ${d.streak} dia${d.streak === 1 ? "" : "s"} seguidos alimentando.` : "Alimente hoje para começar uma sequência."}
              {d.fedToday ? " Já comeu hoje." : ""}
            </p>

            <div>
              <p className="label-mono mb-2">Lancheira</p>
              <ul className="flex flex-wrap gap-2">
                {FOODS.map((f) => {
                  const n = d.inventory[f];
                  const info = PET_FOODS[f];
                  return (
                    <li key={f}>
                      <button
                        type="button"
                        disabled={busy || n === 0}
                        onClick={() => feed(f)}
                        title={`${info.label}: ganha com ${info.source}. +${info.satiety} saciedade, +${info.xp} XP`}
                        aria-label={`Dar ${info.label.toLowerCase()} (${n} na lancheira)`}
                        className="relative grid size-12 place-items-center rounded-xl border border-line bg-field transition-colors hover:border-accent-text disabled:opacity-40 disabled:hover:border-line"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- ícone SVG estático */}
                        <img src={`/pet/comidas/${f}.svg`} alt="" className="size-8" />
                        <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white">{n}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-text-2">Tarefa concluída = cereja · ideia nova = cupcake · marco = torta · projeto concluído = bolo.</p>
            </div>

            <Button variant="secondary" size="sm" icon={<Heart aria-hidden className="size-4" />} onClick={cuddle} disabled={busy} className="justify-self-start">
              Fazer carinho
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
