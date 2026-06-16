"use client";

import { useState } from "react";

/**
 * Foto do apresentador/patrocinador do bolão.
 *
 * ➜ Salve a foto (PNG com fundo transparente) em `public/modelo.png`.
 *   Se o arquivo não existir, o componente simplesmente não aparece
 *   (sem ícone de imagem quebrada).
 */
export default function HeroModel({ className }: { className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/modelo.png"
      alt="Apresentador oficial do Bolão CNBOX"
      className={className}
      onError={() => setOk(false)}
    />
  );
}
