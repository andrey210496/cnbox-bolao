"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EntryButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/entry", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro ao gerar o pagamento.");
      router.push(`/entrada/${d.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={enter}
        disabled={loading}
        className="btn-primary w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50"
      >
        {loading ? "GERANDO PAGAMENTO..." : "ENTRAR NO BOLÃO →"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-[11px] text-white/40">
        Pagamento via PIX, débito ou crédito à vista. Pagamento único da temporada.
      </p>
    </div>
  );
}
