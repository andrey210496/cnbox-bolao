"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBRL } from "@/lib/format";

type Order = {
  id: string;
  status: string;
  amount: number;
  pixPayload: string | null;
  pixQrImage: string | null;
};

const BENEFITS = [
  "Análise completa do confronto pela IA",
  "Os 3 placares mais prováveis, com justificativa",
  "O palpite cravado do Especialista",
  "Aumente suas chances de levar a bolada",
];

export default function SpecialistPanel({
  gameId,
  price,
}: {
  gameId: string;
  price: number;
}) {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [popup, setPopup] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat com o agente de IA (só liberado para quem comprou)
  type Turn = { role: "user" | "assistant"; content: string };
  const [chat, setChat] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, sending]);

  const sendChat = useCallback(
    async (text: string) => {
      const msg = text.trim();
      if (!msg || sending) return;
      const next: Turn[] = [...chat, { role: "user", content: msg }];
      setChat(next);
      setInput("");
      setSending(true);
      setError(null);
      try {
        const res = await fetch(`/api/specialist/${gameId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d?.error ?? "Erro ao conversar.");
        setChat((c) => [...c, { role: "assistant", content: d.reply }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro.");
        setChat((c) => c.slice(0, -1)); // desfaz a msg do usuário em caso de erro
      } finally {
        setSending(false);
      }
    },
    [chat, sending, gameId]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/specialist/${gameId}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      setAccess(Boolean(d.access));
      setOrder(d.order ?? null);
      if (d.access && poll.current) {
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

  // Pop-up de incentivo (uma vez por jogo) para quem não tem acesso
  useEffect(() => {
    if (loading || access) return;
    const key = `cnbox_spec_popup_${gameId}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
      setPopup(true);
      sessionStorage.setItem(key, "1");
    }
  }, [loading, access, gameId]);

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
      if (!res.ok) throw new Error(d?.error ?? "Erro ao gerar o PIX.");
      setPopup(false);
      await load(); // recarrega para pegar o pedido com o PIX
      startPolling();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBuying(false);
    }
  }

  async function copy() {
    if (!order?.pixPayload) return;
    try {
      await navigator.clipboard.writeText(order.pixPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  if (loading) {
    return (
      <div className="card-premium rounded-3xl p-5 mt-5 text-center text-white/40 text-sm">
        Carregando o Especialista...
      </div>
    );
  }

  // ===== TEM ACESSO — CHAT COM O AGENTE =====
  if (access) {
    const SUGGESTIONS = [
      "Qual o placar mais provável?",
      "Faça a análise completa do jogo",
      "Quem tem mais chance de vencer?",
    ];
    return (
      <div className="card-premium glow-brand rounded-3xl p-5 sm:p-6 mt-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🧠</span>
          <h3 className="font-display text-xl tracking-wide">
            ESPECIALISTA <span className="text-brand">CNBOX</span>
          </h3>
          <span className="ml-auto text-[10px] uppercase tracking-widest text-brand bg-brand/15 border border-brand/30 rounded-full px-2 py-0.5">
            Liberado
          </span>
        </div>

        {/* Janela do chat */}
        <div className="rounded-2xl bg-ink/50 border border-white/10 p-3 max-h-[22rem] overflow-y-auto space-y-3">
          {chat.length === 0 && !sending && (
            <div className="text-center py-4">
              <p className="text-3xl mb-2">⚽🤖</p>
              <p className="text-sm text-white/70">
                Converse com o Especialista sobre este jogo. Pergunte placar, escalação,
                tendências — ou peça a análise completa.
              </p>
            </div>
          )}

          {chat.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                  m.role === "user"
                    ? "bg-brand/20 border border-brand/30 text-white"
                    : "bg-white/5 border border-white/10 text-white/85"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex gap-1">
                <span className="h-2 w-2 rounded-full bg-brand/70 animate-bounce [animation-delay:-0.3s]" />
                <span className="h-2 w-2 rounded-full bg-brand/70 animate-bounce [animation-delay:-0.15s]" />
                <span className="h-2 w-2 rounded-full bg-brand/70 animate-bounce" />
              </div>
            </div>
          )}
          <div ref={chatEnd} />
        </div>

        {/* Sugestões rápidas (só no início) */}
        {chat.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendChat(s)}
                disabled={sending}
                className="text-xs rounded-full glass px-3 py-1.5 text-white/70 hover:text-brand disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Campo de mensagem */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendChat(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao Especialista..."
            className="flex-1 rounded-xl bg-ink/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-brand/60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="btn-primary px-5 py-3 rounded-xl font-bold disabled:opacity-50 shrink-0"
          >
            Enviar
          </button>
        </form>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <p className="mt-2 text-[11px] text-white/35">
          Análise de opinião, para entretenimento. Não garante acerto.
        </p>
      </div>
    );
  }

  // ===== PEDIDO PENDENTE (mostra o PIX) =====
  if (order && order.status === "PENDING" && order.pixPayload) {
    return (
      <div className="card-premium rounded-3xl p-6 mt-5">
        <h3 className="font-display text-xl tracking-wide mb-1">
          DESBLOQUEIE O <span className="text-brand">ESPECIALISTA</span>
        </h3>
        <p className="text-sm text-white/60 mb-4">
          Pague {formatBRL(order.amount)} no PIX para liberar a análise deste jogo.
        </p>
        {order.pixQrImage && (
          <div className="bg-white rounded-2xl p-3 w-fit mx-auto glow-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${order.pixQrImage}`}
              alt="QR Code PIX"
              className="w-[190px] h-[190px]"
            />
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/60">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          Aguardando pagamento... libera sozinho ao confirmar
        </div>
        <div className="mt-4 flex items-stretch gap-2">
          <code className="flex-1 text-xs text-white/70 bg-ink/60 border border-white/10 rounded-lg px-3 py-2.5 truncate">
            {order.pixPayload}
          </code>
          <button onClick={copy} className="btn-primary px-5 rounded-lg font-bold text-sm whitespace-nowrap">
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  // ===== SEM ACESSO — CARD DE INCENTIVO =====
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
            Em dúvida no placar? Nosso analista de IA estuda o jogo e te entrega os
            palpites com mais chance. <strong className="text-white">Aposte com vantagem.</strong>
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
            {buying ? "GERANDO PIX..." : `CONTRATAR POR ${formatBRL(price)} →`}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-[11px] text-white/35 text-center">
            Pagamento único para este jogo, via PIX. Não interfere no valor do seu palpite.
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
              Contrate o <strong className="text-white">Especialista CNBOX</strong> e
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
              {buying ? "GERANDO PIX..." : `CONTRATAR POR ${formatBRL(price)}`}
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
