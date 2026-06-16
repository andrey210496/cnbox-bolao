"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { formatBRL } from "@/lib/format";

type Winner = { betId: string; userId: string; name: string; pixKey: string; pixKeyType: string; amount: number };
type Payout = { id: string; betId: string; amount: number; status: string; failReason: string | null; pixKey: string };
type Data = {
  game: { homeTeam: string; awayTeam: string; finalHome: number | null; finalAway: number | null; payoutStatus: string };
  preview: { pool: number; count: number; winners: Winner[] };
  payouts: Payout[];
  balance: number;
};

function maskPix(key: string) {
  if (key.includes("@")) return key.replace(/(.{2}).*(@.*)/, "$1***$2");
  if (key.length > 6) return key.slice(0, 3) + "***" + key.slice(-2);
  return key;
}

const PSTATUS: Record<string, { t: string; c: string }> = {
  PENDING: { t: "A pagar", c: "text-amber-300" },
  PROCESSING: { t: "Processando", c: "text-amber-300" },
  SENT: { t: "Pago ✓", c: "text-brand-light" },
  FAILED: { t: "Falhou", c: "text-red-300" },
};

export default function Apuracao({ gameId }: { gameId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/apuracao/${gameId}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro ao carregar.");
      setData(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    }
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(action: "approve" | "pay") {
    if (action === "pay" && !confirm("Confirmar o PIX em massa para todos os ganhadores? Esta ação move dinheiro real.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/apuracao/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      if (action === "approve") setMsg(`Lista gerada: ${d.count} ganhador(es).`);
      else setMsg(`Pagamentos: ${d.paid} enviados, ${d.failed} falhas.`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro.");
    } finally {
      setBusy(false);
    }
  }

  const winners = data?.preview.winners ?? [];
  const payByBet = new Map((data?.payouts ?? []).map((p) => [p.betId, p]));
  const approved = (data?.payouts.length ?? 0) > 0;
  const allPaid = data?.game.payoutStatus === "PAID";

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[900px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Logo height={28} />
          <Link href="/admin" className="text-sm text-white/60 hover:text-white">← Admin</Link>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl sm:text-4xl mb-6">
          APURAÇÃO <span className="text-brand text-glow">DO JOGO</span>
        </h1>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {data && (
          <>
            <div className="card-premium rounded-3xl p-6 mb-6">
              <p className="text-sm text-white/50">Resultado</p>
              <p className="font-display text-3xl">
                {data.game.homeTeam}{" "}
                <span className="text-brand-light">
                  {data.game.finalHome} - {data.game.finalAway}
                </span>{" "}
                {data.game.awayTeam}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <Box label="Prêmio total" value={formatBRL(data.preview.pool)} accent />
                <Box label="Ganhadores" value={String(data.preview.count)} />
                <Box label="Saldo Asaas" value={formatBRL(data.balance)} />
              </div>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {!allPaid && (
                <button
                  onClick={() => act("approve")}
                  disabled={busy}
                  className="rounded-xl glass px-5 py-3 font-semibold text-white/80 hover:text-white disabled:opacity-50"
                >
                  {approved ? "Recalcular lista" : "Gerar lista de pagamentos"}
                </button>
              )}
              {approved && !allPaid && (
                <button
                  onClick={() => act("pay")}
                  disabled={busy}
                  className="btn-primary rounded-xl px-6 py-3 font-bold disabled:opacity-50"
                >
                  {busy ? "Pagando..." : "Pagar todos via PIX"}
                </button>
              )}
              {allPaid && (
                <span className="rounded-xl bg-brand/15 border border-brand/30 px-5 py-3 text-brand-light font-semibold">
                  ✓ Pagamentos concluídos
                </span>
              )}
              {msg && <span className="text-sm text-white/70">{msg}</span>}
            </div>

            {/* Lista de ganhadores */}
            {data.preview.count === 0 ? (
              <div className="card-premium rounded-3xl p-10 text-center">
                <p className="font-display text-2xl text-gold text-glow-gold">
                  NINGUÉM ACERTOU — A CASA LEVOU 🏠
                </p>
                <p className="text-white/50 text-sm mt-2">
                  Nada a pagar. O prêmio fica com a casa.
                </p>
              </div>
            ) : (
              <div className="card-premium rounded-3xl p-5">
                <div className="space-y-2">
                  {winners.map((w) => {
                    const p = payByBet.get(w.betId);
                    const st = p ? PSTATUS[p.status] ?? PSTATUS.PENDING : null;
                    return (
                      <div key={w.betId} className="flex items-center justify-between gap-3 rounded-xl bg-ink/40 border border-white/5 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white/85 truncate">{w.name}</p>
                          <p className="text-xs text-white/40">{w.pixKeyType} · {maskPix(w.pixKey)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display text-lg text-brand-light tabular-nums">{formatBRL(w.amount)}</p>
                          {st && <p className={`text-[11px] ${st.c}`}>{st.t}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="mt-6 text-center text-xs text-white/35">
              O pagamento usa a API de Transferências PIX do Asaas. Cada ganhador é
              pago uma única vez (trava anti-duplicidade). Falhas podem ser reenviadas.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Box({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-ink/50 border border-white/5 p-3 text-center">
      <p className={`font-display text-xl tabular-nums ${accent ? "text-brand text-glow" : "text-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{label}</p>
    </div>
  );
}
