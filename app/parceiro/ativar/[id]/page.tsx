"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

type OrderData = { id: string; status: string; amount: number; checkoutUrl: string | null };

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AtivarPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/units/order/${id}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      setOrder(d);
      if (d.status === "CONFIRMED" && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    }
  }, [id]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const confirmed = order?.status === "CONFIRMED";

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center">
          <Link href="/parceiro/painel"><Logo height={30} /></Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 sm:px-6 py-10">
        {error && !order && (
          <div className="card-premium rounded-2xl p-6 text-center">
            <p className="text-red-400">{error}</p>
            <Link href="/parceiro/painel" className="mt-4 inline-block text-brand">Ir ao painel</Link>
          </div>
        )}

        {!order && !error && (
          <div className="card-premium rounded-2xl p-10 text-center text-white/50">Carregando...</div>
        )}

        {order && confirmed && (
          <div className="card-premium glow-brand rounded-3xl p-8 text-center float-up">
            <div className="w-20 h-20 mx-auto rounded-full bg-brand/20 border border-brand flex items-center justify-center pulse-ring">
              <span className="text-5xl text-brand">✓</span>
            </div>
            <h1 className="font-display text-3xl mt-5 text-brand text-glow">UNIDADE ATIVADA!</h1>
            <p className="text-white/70 mt-3">Sua unidade já está ativa. Agora é só divulgar seu link e bombar o ranking. 🚀</p>
            <Link href="/parceiro/painel" className="btn-primary mt-6 block py-3.5 rounded-2xl font-bold">Ir para meu painel</Link>
          </div>
        )}

        {order && !confirmed && (
          <div>
            <div className="text-center mb-6">
              <h1 className="font-display text-3xl">ATIVE SUA <span className="text-brand">UNIDADE</span></h1>
              <p className="text-white/60 mt-2 text-sm">Taxa única de ativação · {brl(order.amount)}</p>
            </div>
            <div className="card-premium rounded-3xl p-6 text-center">
              <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-white/55 mb-5">
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">PIX</span>
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Débito</span>
                <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Crédito à vista</span>
              </div>
              {order.checkoutUrl ? (
                <a href={order.checkoutUrl} target="_blank" rel="noopener noreferrer" className="btn-primary block w-full py-4 rounded-2xl font-display text-lg tracking-wide glow-brand">
                  PAGAR {brl(order.amount)} →
                </a>
              ) : (
                <p className="text-white/50 py-6">Gerando seu pagamento...</p>
              )}
              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/60">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Aguardando pagamento... ativa sozinho ao confirmar ✅
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
