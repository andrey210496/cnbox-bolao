"use client";

import { useState } from "react";

export default function CopyLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(
    `Faça seu palpite no Bolão CNBOX! 🏆⚽\n${link}`
  )}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl bg-ink/70 border border-white/10 p-2">
        <input
          readOnly
          value={link}
          className="flex-1 bg-transparent px-2 text-sm text-brand outline-none"
        />
        <button
          onClick={copy}
          className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold shrink-0"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center rounded-2xl bg-[#25D366] text-black font-semibold py-3 hover:opacity-90 transition"
      >
        Compartilhar no WhatsApp
      </a>
    </div>
  );
}
