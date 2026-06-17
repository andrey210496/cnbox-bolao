"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPhone, formatCPF } from "@/lib/validation";

export default function UnitRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    holderName: "",
    holderPhone: "",
    holderCpf: "",
    pixKey: "",
    password: "",
  });
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push(`/parceiro/ativar/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-xl bg-ink/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-brand/60 transition";

  return (
    <form onSubmit={submit} className="card-premium rounded-3xl p-6 sm:p-8 space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Nome da unidade</label>
        <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: CNBOX Centro" autoComplete="off" />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Seu nome (responsável)</label>
        <input className={input} value={form.holderName} onChange={(e) => set("holderName", e.target.value)} placeholder="Ex: João da Silva" autoComplete="name" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">WhatsApp</label>
          <input className={input} inputMode="numeric" value={form.holderPhone} onChange={(e) => set("holderPhone", formatPhone(e.target.value))} placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1.5">CPF</label>
          <input className={`${input} tabular-nums`} inputMode="numeric" value={form.holderCpf} onChange={(e) => set("holderCpf", formatCPF(e.target.value))} placeholder="000.000.000-00" />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Chave PIX <span className="text-white/30">(para receber sua comissão)</span>
        </label>
        <input className={input} value={form.pixKey} onChange={(e) => set("pixKey", e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Crie uma senha <span className="text-white/30">(acesso ao seu painel)</span>
        </label>
        <input className={input} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
      </div>

      <div className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-white/75">
        💳 Para ativar sua unidade há uma <strong className="text-white">taxa única de R$ 49,90</strong>.
        Depois de cadastrar você será levado ao pagamento (PIX, débito ou crédito). A unidade fica
        ativa assim que o pagamento for confirmado.
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <label className="flex items-start gap-2.5 text-[12px] text-white/55 leading-relaxed cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand shrink-0" />
        <span>
          Sou maior de 18 anos e li e aceito os{" "}
          <Link href="/termos" target="_blank" className="text-brand hover:text-brand-light underline">termos</Link>
          . Autorizo o uso dos meus dados (CPF, WhatsApp e chave PIX) para a cobrança de ativação e
          pagamento da comissão.
        </span>
      </label>

      <button type="submit" disabled={loading || !consent} className="btn-primary w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50">
        {loading ? "CADASTRANDO..." : "CADASTRAR E ATIVAR (R$ 49,90) →"}
      </button>

      <p className="text-center text-sm text-white/50">
        Já tem unidade cadastrada?{" "}
        <Link href="/parceiro/entrar" className="text-brand hover:text-brand-light">Entrar no painel</Link>
      </p>
    </form>
  );
}
