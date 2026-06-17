"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActivateUnitBanner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/units/order", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      router.push(`/parceiro/ativar/${d.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
      setLoading(false);
    }
  }

  return (
    <div className="card-premium glow-brand rounded-3xl p-6 mb-6 text-center border border-amber-400/30">
      <div className="text-3xl mb-2">🔒</div>
      <h2 className="font-display text-2xl">UNIDADE <span className="text-amber-300">INATIVA</span></h2>
      <p className="text-white/65 text-sm mt-2">
        Sua unidade ainda não está ativa. Pague a <strong className="text-white">taxa única de
        ativação</strong> para liberar seu link, receber alunos e abrir o bolão.
      </p>
      <button
        onClick={activate}
        disabled={loading}
        className="btn-primary mt-5 px-6 py-3 rounded-2xl font-bold disabled:opacity-50"
      >
        {loading ? "GERANDO PAGAMENTO..." : "ATIVAR MINHA UNIDADE →"}
      </button>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
