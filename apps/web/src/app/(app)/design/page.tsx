import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignShowcase } from "./showcase";

export const metadata: Metadata = { title: "Design system" };

/** Catálogo interno dos componentes (E3-6). Disponível só em desenvolvimento. */
export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignShowcase />;
}
