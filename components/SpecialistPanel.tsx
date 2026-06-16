"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBRL } from "@/lib/format";

type Order = {
  id: string;
  status: string;
  amount: number;
  checkoutUrl: string | null;
};

const BENEFITS = [
  "Análise completa do confronto pela IA",
  "Os 3 placares mais prováveis, com justificativa",
  "O palpite cravado do Especialista",
  "Vale para 1 uso neste jogo",
];

export default function SpecialistPanel({
  gameId,
  price,
}: {
  gameId: string;
  price: number;
}) {
  const [loading, setLoading] = useState(true);
  const [hasDica, setHasDica] = useState(false); // dica paga e ainda não usada
  const [order, setOrder] = useState<Order | null>(null);
  const [dica, setDica] = useState<string | null>(null); // conteúdo revelado
  const [buying, setBuying] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/specialist/${gameId}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      setHasDica(Boolean(d.hasDica));
      setOrder(d.order ?? null);
      if (d.hasDica && poll.current) {
        clearInterval(poll.current);
        poll.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    load();
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [load]);

  // Pop-up de incentivo (uma vez por jogo) para quem não tem dica
  useEffect(() => {
    if (loading || hasDica || dica) return;
    const key = `cnbox_spec_popup_${gameId}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
      setPopup(true);
      sessionStorage.setItem(key, "1");
    }
  }, [loading, hasDica, dica, gameId]);

  function startPolling() {
    if (poll.current) return;
    poll.current = setInterval(load, 4000);
  }

  async function buy() {
    setError(null);
    setBuying(true);
    try {
      const res = await fetch(`/api/specialist/${gameId}`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro ao gerar o pagamento.");
      setPopup(false);
      setDica(null);
      await load();
      startPolling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBuying(false);
    }
  }

  async function reveal() {
    setRevealing(true);
    setError(null);
    try {
      const res = await fetch(`/api/specialist/${gameId}/analysis`, { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro ao gerar a dica.");
      setDica(d.content);
      setHasDica(false); // consumida
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setRevealing(false);
    }
  }

  if (loading) {
    return (
      <div className="card-premium rounded-3xl p-5 mt-5 text-center text-white/40 text-sm">
        Carregando o Especialista...
      </div>
    );
  }

  // ===== DICA REVELADA =====
  if (dica) {
    return (
      <div className="card-premium glow-brand rounded-3xl p-6 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🧠</span>
          <h3 className="font-display text-xl tracking-wide">
            DICA DO <span className="text-brand">ESPECIALISTA</span>
          </h3>
        </div>
        <div className="rounded-2xl bg-ink/50 border border-white/10 p-4 text-sm text-white/85 whitespace-pre-line leading-relaxed">
          {dica}
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-ink/40 px-4 py-3 text-center">
          <p className="text-sm text-white/60 mb-2">Quer uma nova dica deste jogo?</p>
          <button
            onClick={buy}
            disabled={buying}
            className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {buying ? "GERANDO..." : `Comprar outra dica · ${formatBRL(price)}`}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <p className="mt-3 text-[11px] text-white/35">
          Dica de opinião, para entretenimento. Não garante acerto.
        </p>
      </div>
    );
  }

  // ===== TEM DICA DISPONÍVEL (paga, não usada) =====
  if (hasDica) {
    return (
      <div className="card-premium glow-brand rounded-3xl p-6 mt-5 text-center">
        <div className="text-3xl mb-2">🧠✅</div>
        <h3 className="font-display text-xl tracking-wide mb-1">
          VOCÊ TEM <span className="text-brand">1 DICA</span> DISPONÍVEL
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Revele a análise do Especialista para este jogo. (uso único)
        </p>
        <button
          onClick={reveal}
          disabled={revealing}
          className="btn-primary w-full py-3.5 rounded-2xl font-bold disabled:opacity-50"
        >
          {revealing ? "Analisando o jogo..." : "Ver a dica do Especialista →"}
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // ===== PEDIDO PENDENTE (mostra o checkout) =====
  if (order && order.status === "PENDING" && order.checkoutUrl) {
    return (
      <div className="card-premium rounded-3xl p-6 mt-5 text-center">
        <h3 className="font-display text-xl tracking-wide mb-1">
          DESBLOQUEIE A <span className="text-brand">DICA</span>
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Pague {formatBRL(order.amount)} para liberar a dica do Especialista deste jogo.
        </p>
        <div className="flex items-center justify-center flex-wrap gap-2 text-xs text-white/55 mb-4">
          <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">PIX</span>
          <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Débito</span>
          <span className="rounded-full bg-ink/60 border border-white/10 px-2.5 py-1">Crédito à vista</span>
        </div>
        <a
          href={order.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary block w-full py-3.5 rounded-2xl font-bold glow-brand"
        >
          PAGAR {formatBRL(order.amount)} →
        </a>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/60">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Aguardando pagamento... libera sozinho ao confirmar
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // ===== SEM DICA — CARD DE INCENTIVO =====
  return (
    <>
      <div className="relative card-premium rounded-3xl p-6 mt-5 overflow-hidden">
        <div className="absolute inset-0 stadium-beams pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🧠</span>
            <h3 className="font-display text-xl tracking-wide">
              ESPECIALISTA <span className="text-brand text-glow">CNBOX</span>
            </h3>
          </div>
          <p className="text-sm text-white/70 mb-4">
            Em dúvida no placar? Peça <strong className="text-white">uma dica</strong> da nossa
            IA: ela estuda o jogo e te entrega os palpites com mais chance.{" "}
            <strong className="text-white">Aposte com vantagem.</strong>
          </p>
          <ul className="space-y-1.5 mb-5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-white/75">
                <span className="text-brand mt-0.5">✓</span> {b}
              </li>
            ))}
          </ul>
          <button
            onClick={buy}
            disabled={buying}
            className="btn-primary w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50"
          >
            {buying ? "GERANDO PAGAMENTO..." : `PEDIR DICA POR ${formatBRL(price)} →`}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-[11px] text-white/35 text-center">
            Pagamento por dica (uso único), via PIX, débito ou crédito à vista. Não interfere
            no valor do seu palpite.
          </p>
        </div>
      </div>

      {/* POP-UP de incentivo */}
      {popup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="card-premium glow-brand rounded-3xl p-7 w-full max-w-sm text-center float-up">
            <div className="text-4xl mb-2">🧠⚽</div>
            <h3 className="font-display text-2xl">
              QUER O <span className="text-brand text-glow">PALPITE CERTO?</span>
            </h3>
            <p className="text-sm text-white/70 mt-2">
              Peça uma <strong className="text-white">dica do Especialista CNBOX</strong> e
              receba a análise da IA com os placares mais prováveis deste jogo.
            </p>
            <ul className="text-left text-sm text-white/75 mt-4 space-y-1.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="text-brand mt-0.5">✓</span> {b}
                </li>
              ))}
            </ul>
            <button
              onClick={buy}
              disabled={buying}
              className="btn-primary w-full py-3.5 rounded-2xl font-bold mt-5 disabled:opacity-50"
            >
              {buying ? "GERANDO..." : `PEDIR DICA POR ${formatBRL(price)}`}
            </button>
            <button
              onClick={() => setPopup(false)}
              className="mt-3 text-sm text-white/40 hover:text-white"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </>
  );
}
