import type { Metadata } from "next";
import { Archivo, Monsieur_La_Doulaise, Space_Mono } from "next/font/google";
import "./globals.css";

// Tipografia aprovada (D-20): grotesca pesada + script floreado nos detalhes + mono nos rótulos.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });
const monsieur = Monsieur_La_Doulaise({ variable: "--font-monsieur", subsets: ["latin"], weight: "400" });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: { default: "Annalu Studio OS", template: "%s · Annalu Studio OS" },
  description: "Centro de comando digital da Dev Annalu.",
};

/**
 * Aplica o tema salvo antes da primeira pintura (evita "piscar" do tema errado).
 * Conteúdo fixo e sem dados da usuária: seguro para inline.
 */
const themeInit = `try{var t=localStorage.getItem("tema");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${monsieur.variable} ${spaceMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
