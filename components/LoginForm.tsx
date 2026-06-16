"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCPF } from "@/lib/validation";

export default function LoginForm() {
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpf, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao entrar.");
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
        <label className="block text-sm text-white/60 mb-1.5">CPF</label>
        <input
          className={`${input} tabular-nums`}
          inputMode="numeric"
          value={cpf}
          onChange={(e) => setCpf(formatCPF(e.target.value))}
          placeholder="000.000.000-00"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1.5">Senha</label>
        <input
          className={input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha"
          autoComplete="current-password"
        />
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-4 rounded-2xl font-display text-lg tracking-wide disabled:opacity-50"
      >
        {loading ? "ENTRANDO..." : "ENTRAR"}
      </button>

      <p className="text-center text-sm text-white/50">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-brand hover:text-brand-light">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
