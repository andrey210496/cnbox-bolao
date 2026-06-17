"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

type EntryData = {
  id: string;
  status: string;
  amount: number;
  checkoutUrl: string | null;
};

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EntradaPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [entry, setEntry] = useState<EntryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/entry/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao carregar.");
      setEntry(data);
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

  const confirmed = entry?.status === "CONFIRMED";

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center">
          <Link href="/app"><Logo height={30} /></Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-10">
        {error && !entry && (
          <div className="card-premium rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link href="/app" className="mt-4 inline-block text-brand">Voltar</Link>
          </div>
        )}

        {!entry && !error && (
          <div className="card-premium rounded-2xl p-10 text-center text-white/50">Carregando...</div>
        )}

        {entry && confirmed && (
          <div className="card-premium glow-brand rounded-3xl p-8 text-center float-up">
            <div className="w-20 h-20 mx-auto rounded-full bg-brand/20 border border-brand flex items-center justify-center pulse-ring">
              <span className="text-5xl text-brand">✓</span>
            </div>
            <h1 className="font-display text-3xl mt-5 text-brand text-glow">VOCÊ ESTÁ NO BOLÃO!</h1>
            <p className="text-white/70 mt-3">
              Entrada confirmada. Agora é só palpitar em todos os jogos da Copa e somar pontos. 🏆
            </p>
            <Link href="/app" className="btn-primary mt-6 block py-3.5 rounded-2xl font-bold">
              Começar a palpitar
            </Link>
          </div>
        )}

        {entry && !confirmed && (
          <div>
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl">ENTRE NO <span className="text-brand">BOLÃO</span></h1>
              <p className="text-white/60 mt-2 text-sm">Pagamento único · {brl(entry.amount)}</p>
            </div>
            <div className="card-premium rounded-3xl p-6 text-center">
              <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-white/55 mb-5">
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">PIX</span>
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Cartão de débito</span>
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Crédito à vista</span>
              </div>
              {entry.checkoutUrl ? (
                <a
                  href={entry.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary block w-full py-4 rounded-2xl font-display text-lg tracking-wide glow-brand"
                >
                  PAGAR {brl(entry.amount)} →
                </a>
              ) : (
                <p className="text-white/50 py-6">Gerando seu pagamento...</p>
              )}
              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/60">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Aguardando pagamento... esta tela confirma sozinha ✅
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
