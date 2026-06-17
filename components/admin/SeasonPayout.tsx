"use client";

import { useCallback, useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";

type Winner = { userId: string; unitName: string; name: string; pixKey: string; amount: number; points: number };
type Payout = { id: string; userId: string; amount: number; status: string; failReason: string | null };

export default function SeasonPayout() {
  const [data, setData] = useState<{ winners: Winner[]; totalPool: number; payouts: Payout[]; balance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payout", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(action: "approve" | "pay") {
    const label = action === "approve" ? "gerar a lista de prêmios" : "PAGAR os prêmios via PIX agora";
    if (!confirm(`Tem certeza que deseja ${label}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      setMsg(action === "approve" ? `✅ ${d.count} ganhador(es) na lista.` : `✅ Pagos ${d.paid} · falhas ${d.failed}.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (!data) return <p className="text-white/40 text-sm">Carregando...</p>;

  const toPay = data.payouts.filter((p) => ["PENDING", "FAILED"].includes(p.status));
  const totalToPay = data.payouts.reduce((s, p) => (["PENDING", "FAILED"].includes(p.status) ? s + p.amount : s), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Prêmio total (todas unidades)" value={formatBRL(data.totalPool)} accent />
        <Stat label="Ganhadores previstos" value={String(data.winners.length)} />
        <Stat label="Saldo no Asaas" value={formatBRL(data.balance)} />
        <Stat label="A pagar agora" value={formatBRL(totalToPay)} accent />
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => run("approve")} disabled={busy} className="btn-primary rounded-xl px-5 py-2.5 font-bold disabled:opacity-50">
          1) Gerar lista de prêmios
        </button>
        <button onClick={() => run("pay")} disabled={busy || toPay.length === 0} className="rounded-xl glass px-5 py-2.5 font-bold text-brand hover:text-brand-light disabled:opacity-40">
          2) Pagar via PIX ({toPay.length})
        </button>
        {msg && <span className="self-center text-sm text-brand-light">{msg}</span>}
      </div>

      <section className="card-premium rounded-3xl p-5 sm:p-6">
        <h3 className="font-display text-xl mb-3">GANHADORES <span className="text-brand">PREVISTOS</span></h3>
        {data.winners.length === 0 ? (
          <p className="text-white/40 text-sm">Nenhum ganhador ainda (sem pontuação ou sem prêmio).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-white/45 text-left text-xs uppercase tracking-wider">
                  <th className="py-2 pr-4">Unidade</th>
                  <th className="py-2 px-4">Ganhador</th>
                  <th className="py-2 px-4 text-right">Pontos</th>
                  <th className="py-2 px-4">PIX</th>
                  <th className="py-2 pl-4 text-right">Prêmio</th>
                </tr>
              </thead>
              <tbody>
                {data.winners.map((w) => {
                  const po = data.payouts.find((p) => p.userId === w.userId);
                  return (
                    <tr key={w.userId} className="border-t border-white/5">
                      <td className="py-3 pr-4 text-white/70">{w.unitName}</td>
                      <td className="py-3 px-4">{w.name}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-brand">{w.points}</td>
                      <td className="py-3 px-4 text-white/50 text-xs">{w.pixKey || "—"}</td>
                      <td className="py-3 pl-4 text-right tabular-nums text-brand-light font-semibold">
                        {formatBRL(w.amount)}
                        {po && <span className="block text-[10px] text-white/40">{po.status}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-white/30">
        Fluxo: confira os ganhadores → <strong>Gerar lista</strong> (congela os valores) →{" "}
        <strong>Pagar via PIX</strong>. Só rode quando a Copa terminar e todos os jogos
        estiverem com placar lançado. Garanta saldo no Asaas antes de pagar.
      </p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-premium rounded-2xl p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`font-display text-2xl mt-1 tabular-nums ${accent ? "text-brand text-glow" : "text-white"}`}>{value}</p>
    </div>
  );
}
