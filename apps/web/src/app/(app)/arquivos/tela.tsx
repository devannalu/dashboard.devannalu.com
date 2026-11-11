"use client";

import { PageHeader } from "@/components/app/common";
import { FilesPanel } from "@/components/app/files-panel";
import { Card } from "@/components/ui/display";

/** Biblioteca central de arquivos (E11-4). */
export default function Arquivos() {
  return (
    <>
      <PageHeader title="seus" script="arquivos" description="Guardados no seu armazenamento privado. Só você acessa, sempre depois do login." />
      <Card>
        <FilesPanel />
      </Card>
    </>
  );
}
