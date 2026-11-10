import { AppShell } from "@/components/shell/app-shell";

/** Telas do aplicativo (dentro do menu e da colagem). Login e primeiro acesso ficarão fora deste grupo. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
