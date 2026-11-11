import Image from "next/image";
import { Collage } from "@/components/shell/collage";

/** Telas fora do app (login e primeiro acesso): colagem sutil ao fundo e cartão de vidro central. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Collage level="sutil" />
      <main className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
        <div className="glass grid w-full max-w-[440px] gap-6 rounded-[26px] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Image src="/brand/cereja-8.png" alt="" width={40} height={55} className="h-auto w-10 drop-shadow" priority />
            <span className="leading-none">
              <span className="block font-script text-[44px] leading-[0.8] text-accent-text">Annalu</span>
              <span className="block font-display text-sm font-black tracking-tight lowercase">studio os</span>
            </span>
          </div>
          {children}
        </div>
      </main>
    </>
  );
}
