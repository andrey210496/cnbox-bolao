"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

type BetData = {
  id: string;
  status: string;
  homeScore: number;
  awayScore: number;
  amount: number;
  checkoutUrl: string | null;
  homeTeam: string;
  awayTeam: string;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PagamentoPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [bet, setBet] = useState<BetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/bets/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao carregar.");
      setBet(data);
      if (data.status === "CONFIRMED" && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }, [id]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const confirmed = bet?.status === "CONFIRMED";

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center">
          <Link href="/app">
            <Logo height={30} />
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-10">
        {error && !bet && (
          <div className="card-premium rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link href="/app" className="mt-4 inline-block text-brand">
              Voltar
            </Link>
          </div>
        )}

        {!bet && !error && (
          <div className="card-premium rounded-2xl p-10 text-center text-white/50">
            Carregando seu pagamento...
          </div>
        )}

        {bet && confirmed && (
          <div className="card-premium glow-brand rounded-3xl p-8 text-center float-up">
            <div className="w-20 h-20 mx-auto rounded-full bg-brand/20 border border-brand flex items-center justify-center pulse-ring">
              <span className="text-5xl text-brand">✓</span>
            </div>
            <h1 className="font-display text-3xl mt-5 text-brand text-glow">
              PALPITE CONFIRMADO!
            </h1>
            <p className="text-white/70 mt-3">
              Pagamento aprovado. Seu palpite{" "}
              <strong className="text-white">
                {bet.homeTeam} {bet.homeScore} - {bet.awayScore} {bet.awayTeam}
              </strong>{" "}
              já está valendo.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/app" className="btn-primary py-3.5 rounded-2xl font-bold">
                Palpitar em outro jogo
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/40">
              Se você acertar, o prêmio cai no seu PIX em até 24h após o jogo.
            </p>
          </div>
        )}

        {bet && !confirmed && (
          <div>
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl">
                FINALIZE SEU <span className="text-brand">PALPITE</span>
              </h1>
              <p className="text-white/60 mt-2 text-sm">
                {bet.homeTeam}{" "}
                <strong className="text-white">
                  {bet.homeScore} - {bet.awayScore}
                </strong>{" "}
                {bet.awayTeam} · {brl(bet.amount)}
              </p>
            </div>

            <div className="card-premium rounded-3xl p-6 text-center">
              <p className="text-white/70 text-sm mb-1">Escolha como pagar:</p>
              <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-white/55 mb-5">
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">PIX</span>
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Cartão de débito</span>
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Crédito à vista</span>
              </div>

              {bet.checkoutUrl ? (
                <a
                  href={bet.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary block w-full py-4 rounded-2xl font-display text-lg tracking-wide glow-brand"
                >
                  PAGAR {brl(bet.amount)} →
                </a>
              ) : (
                <p className="text-white/50 py-6">Gerando seu pagamento...</p>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/60">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Aguardando pagamento... esta tela confirma sozinha ✅
              </div>
            </div>

            <ol className="mt-6 space-y-2 text-sm text-white/50">
              <li>1. Clique em <strong className="text-white/70">Pagar</strong> e escolha PIX, débito ou crédito.</li>
              <li>2. Conclua o pagamento na página segura do Asaas.</li>
              <li>3. Volte aqui — assim que cair, seu palpite é confirmado. 🎉</li>
            </ol>

            {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
