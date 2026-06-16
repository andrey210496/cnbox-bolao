"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCPF, formatPhone } from "@/lib/validation";

type UnitOption = { id: string; name: string };

export default function RegisterForm({
  units,
  presetUnitId,
}: {
  units: UnitOption[];
  presetUnitId?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    cpf: "",
    pixKey: "",
    unitId: presetUnitId ?? "",
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
      setError("Você precisa aceitar os termos e o uso dos seus dados.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao cadastrar.");
      router.push("/app");
      router.refresh();
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
        <label className="block text-sm text-white/60 mb-1.5">Nome completo</label>
        <input
          className={input}
          value={form.fullName}
          onChange={(e) => set("fullName", e.target.value)}
          placeholder="Ex: João da Silva"
          autoComplete="name"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Telefone (WhatsApp)</label>
          <input
            className={input}
            inputMode="numeric"
            value={form.phone}
            onChange={(e) => set("phone", formatPhone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1.5">CPF</label>
          <input
            className={`${input} tabular-nums`}
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => set("cpf", formatCPF(e.target.value))}
            placeholder="000.000.000-00"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">
          Chave PIX{" "}
          <span className="text-white/30">(para receber o prêmio se ganhar)</span>
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
          Unidade onde você treina
        </label>
        {units.length > 0 ? (
          <select
            className={`${input} appearance-none`}
            value={form.unitId}
            onChange={(e) => set("unitId", e.target.value)}
          >
            <option value="" className="bg-ink">
              Selecione sua unidade
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id} className="bg-ink">
                {u.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-white/45 bg-ink/60 border border-white/10 rounded-xl px-4 py-3">
            Nenhuma unidade cadastrada ainda. Peça para o responsável da sua unidade
            se cadastrar em{" "}
            <Link href="/parceiro" className="text-brand hover:text-brand-light">
              /parceiro
            </Link>
            .
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1.5">Crie uma senha</label>
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
            termos e a política de privacidade
          </Link>
          . Autorizo o uso dos meus dados (CPF, telefone e chave PIX) para
          identificação e pagamento do prêmio.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !consent}
        className="btn-primary w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50"
      >
        {loading ? "CRIANDO CONTA..." : "CRIAR CONTA E PALPITAR →"}
      </button>

      <p className="text-center text-sm text-white/50">
        Já tem conta?{" "}
        <Link href="/entrar" className="text-brand hover:text-brand-light">
          Entrar
        </Link>
      </p>
    </form>
  );
}
