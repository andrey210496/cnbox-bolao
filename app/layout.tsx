import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bolão CNBOX — Copa do Mundo",
  description:
    "Palpite no placar dos jogos da Copa por R$10 via PIX e concorra ao prêmio. Bolão CNBOX.",
  openGraph: {
    title: "Bolão CNBOX — Copa do Mundo",
    description:
      "Acertou o placar, levou a bolada. Palpite em todos os jogos da Copa via PIX.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
