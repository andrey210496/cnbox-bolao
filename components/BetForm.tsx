"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Flag from "./Flag";
import { formatBRL } from "@/lib/format";

type Team = { code: string; name: string };

function Stepper({
  code,
  team,
  value,
  onChange,
}: {
  code: string;
  team: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.max(0, Math.min(20, v)));
  return (
    <div className="flex flex-col items-center gap-3 flex-1">
      <Flag code={code} name={team} className="w-16 h-11" />
      <span className="font-display text-base sm:text-lg tracking-wide text-center">
        {team}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => set(value - 1)}
          className="w-10 h-10 rounded-full glass text-2xl text-white/70 hover:text-brand active:scale-90 transition"
          aria-label={`Diminuir ${team}`}
        >
          −
        </button>
        <div className="scoreboard w-[68px] h-24 rounded-2xl flex items-center justify-center">
          <span className="font-display text-6xl text-brand-light text-glow tabular-nums">
            {value}
          </span>
        </div>
        <button
          type="button"
          onClick={() => set(value + 1)}
          className="w-10 h-10 rounded-full glass text-2xl text-white/70 hover:text-brand active:scale-90 transition"
          aria-label={`Aumentar ${team}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function BetForm({
  gameId,
  home,
  away,
  price,
}: {
  gameId: string;
  home: Team;
  away: Team;
  price: number;
}) {
  const router = useRouter();
  const [h, setH] = useState(1);
  const [a, setA] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, homeScore: h, awayScore: a }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao gerar o PIX.");
      router.push(`/pagamento/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <div className="card-premium rounded-3xl p-6 sm:p-8 pitch-lines">
      <p className="text-center text-[11px] uppercase tracking-[0.3em] text-white/40 mb-6">
        Qual vai ser o placar?
      </p>
      <div className="flex items-start justify-center gap-3 sm:gap-6">
        <Stepper code={home.code} team={home.name} value={h} onChange={setH} />
        <span className="font-display text-3xl text-white/25 mt-16">×</span>
        <Stepper code={away.code} team={away.name} value={a} onChange={setA} />
      </div>

      {error && (
        <p className="mt-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="btn-primary mt-7 w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50"
      >
        {loading ? "GERANDO PIX..." : `PAGAR ${formatBRL(price)} NO PIX`}
      </button>
      <p className="mt-4 text-center text-xs text-white/40">
        Pagamento via PIX pelo Asaas. Seu palpite entra no bolão após a confirmação.
      </p>
    </div>
  );
}
