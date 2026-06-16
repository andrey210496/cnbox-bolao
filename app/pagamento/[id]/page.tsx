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
  pixPayload: string | null;
  pixQrImage: string | null;
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
  const [copied, setCopied] = useState(false);
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

  async function copy() {
    if (!bet?.pixPayload) return;
    try {
      await navigator.clipboard.writeText(bet.pixPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar. Copie manualmente.");
    }
  }

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
            Carregando seu PIX...
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
                PAGUE VIA <span className="text-brand">PIX</span>
              </h1>
              <p className="text-white/60 mt-2 text-sm">
                {bet.homeTeam}{" "}
                <strong className="text-white">
                  {bet.homeScore} - {bet.awayScore}
                </strong>{" "}
                {bet.awayTeam} · {brl(bet.amount)}
              </p>
            </div>

            <div className="card-premium rounded-3xl p-6">
              {bet.pixQrImage ? (
                <div className="bg-white rounded-2xl p-4 mx-auto w-fit glow-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${bet.pixQrImage}`}
                    alt="QR Code PIX"
                    width={220}
                    height={220}
                    className="w-[220px] h-[220px]"
                  />
                </div>
              ) : (
                <p className="text-center text-white/50 py-10">
                  QR Code indisponível. Use o código copia e cola.
                </p>
              )}

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/60">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Aguardando pagamento...
              </div>

              {bet.pixPayload && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-2">
                    PIX Copia e Cola
                  </p>
                  <div className="flex items-stretch gap-2">
                    <code className="flex-1 text-xs text-white/70 bg-ink/60 border border-white/10 rounded-lg px-3 py-2.5 truncate">
                      {bet.pixPayload}
                    </code>
                    <button
                      onClick={copy}
                      className="btn-primary px-5 rounded-lg font-bold text-sm whitespace-nowrap"
                    >
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ol className="mt-6 space-y-2 text-sm text-white/50">
              <li>1. Abra o app do seu banco e escolha PIX.</li>
              <li>2. Escaneie o QR Code ou cole o código.</li>
              <li>3. Confirme — esta tela atualiza sozinha. ✅</li>
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
