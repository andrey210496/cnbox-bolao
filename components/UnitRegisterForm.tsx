"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhone } from "@/lib/validation";

export default function UnitRegisterForm() {
  const [form, setForm] = useState({
    name: "",
    holderName: "",
    holderPhone: "",
    pixKey: "",
    password: "",
  });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Você precisa aceitar os termos.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/units/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao cadastrar.");
      setLink(data.link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const input =
    "w-full rounded-xl bg-ink/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-brand/60 transition";

  // Tela de sucesso — mostra o link de divulgação do holder
  if (link) {
    const wa = `https://wa.me/?text=${encodeURIComponent(
      `Faça seu palpite no Bolão CNBOX! 🏆⚽\n${link}`
    )}`;
    return (
      <div className="card-premium rounded-3xl p-6 sm:p-8 text-center space-y-5">
        <div className="text-4xl">✅</div>
        <h2 className="font-display text-2xl">
          UNIDADE <span className="text-brand">CADASTRADA!</span>
        </h2>
        <p className="text-white/60 text-sm">
          Este é o <strong className="text-white">seu link de divulgação</strong>. Todo aluno
          que se cadastrar e palpitar por ele conta como indicação da sua unidade — e gera{" "}
          <strong className="text-white">comissão pra você</strong>.
        </p>

        <div className="flex items-center gap-2 rounded-xl bg-ink/70 border border-white/10 p-2">
          <input
            readOnly
            value={link}
            className="flex-1 bg-transparent px-2 text-sm text-brand outline-none"
          />
          <button
            onClick={copy}
            className="rounded-lg btn-primary px-4 py-2 text-sm font-semibold shrink-0"
          >
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-2xl bg-[#25D366] text-black font-semibold py-3.5 hover:opacity-90 transition"
        >
          Compartilhar no WhatsApp
        </a>

        <p className="text-xs text-white/40">
          A comissão é paga na chave PIX que você cadastrou, após o resultado de cada jogo.
        </p>
        <Link
          href="/parceiro/painel"
          className="block w-full btn-primary py-3.5 rounded-2xl font-display tracking-wide"
        >
          IR PARA MEU PAINEL →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card-premium rounded-3xl p-6 sm:p-8 space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Nome da unidade</label>
        <input
          className={input}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ex: CNBOX Centro"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Seu nome (responsável)</label>
        <input
          className={input}
          value={form.holderName}
          onChange={(e) => set("holderName", e.target.value)}
          placeholder="Ex: João da Silva"
          autoComplete="name"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">WhatsApp</label>
        <input
          className={input}
          inputMode="numeric"
          value={form.holderPhone}
          onChange={(e) => set("holderPhone", formatPhone(e.target.value))}
          placeholder="(00) 00000-0000"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Chave PIX{" "}
          <span className="text-white/30">(para receber sua comissão)</span>
        </label>
        <input
          className={input}
          value={form.pixKey}
          onChange={(e) => set("pixKey", e.target.value)}
          placeholder="CPF, e-mail, telefone ou chave aleatória"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Crie uma senha{" "}
          <span className="text-white/30">(acesso ao seu painel)</span>
        </label>
        <input
          className={input}
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <label className="flex items-start gap-2.5 text-[12px] text-white/55 leading-relaxed cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand shrink-0"
        />
        <span>
          Sou maior de 18 anos e li e aceito os{" "}
          <Link href="/termos" target="_blank" className="text-brand hover:text-brand-light underline">
            termos
          </Link>
          . Autorizo o uso dos meus dados (WhatsApp e chave PIX) para pagamento da comissão.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !consent}
        className="btn-primary w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50"
      >
        {loading ? "CADASTRANDO..." : "GERAR MEU LINK →"}
      </button>

      <p className="text-center text-sm text-white/50">
        Já tem unidade cadastrada?{" "}
        <Link href="/parceiro/entrar" className="text-brand hover:text-brand-light">
          Entrar no painel
        </Link>
      </p>
    </form>
  );
}
