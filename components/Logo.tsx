"use client";

import { useState } from "react";

type LogoProps = {
  className?: string;
  /** altura em px do logo */
  height?: number;
};

/**
 * Logo CNBOX.
 *
 * ➜ PARA TROCAR A LOGO: substitua o arquivo `public/cnbox-logo.png`.
 *   Ela aparece automaticamente em todo o site.
 *
 * Se por algum motivo o arquivo não existir/carregar, cai no wordmark
 * vetorial (fallback) — sem "ícone de imagem quebrada".
 */
const LOGO_SRC = "/cnbox-logo.png";

export default function Logo({ className, height = 44 }: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={LOGO_SRC}
        alt="CNBOX"
        style={{ height, width: "auto" }}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 360 90"
      height={height}
      role="img"
      aria-label="CNBOX"
      className={className}
      style={{ width: "auto" }}
    >
      <defs>
        <mask id="cnbox-grunge">
          <rect x="0" y="0" width="360" height="90" fill="white" />
          <g fill="black">
            <rect x="14" y="22" width="40" height="4" transform="rotate(-8 34 24)" />
            <rect x="120" y="50" width="34" height="5" transform="rotate(6 137 52)" />
            <rect x="250" y="18" width="30" height="4" transform="rotate(10 265 20)" />
            <rect x="300" y="58" width="44" height="5" transform="rotate(-6 322 60)" />
            <circle cx="70" cy="68" r="2.5" />
            <circle cx="190" cy="30" r="2" />
            <circle cx="330" cy="40" r="2.5" />
            <rect x="200" y="62" width="18" height="3" />
          </g>
        </mask>
      </defs>
      <text
        x="50%"
        y="68"
        textAnchor="middle"
        fontFamily="var(--font-anton), system-ui, sans-serif"
        fontSize="74"
        letterSpacing="1"
        fill="#29e31b"
        mask="url(#cnbox-grunge)"
      >
        CNBOX
      </text>
    </svg>
  );
}
