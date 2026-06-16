"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function AdminLogin() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? "Erro ao entrar.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-xl bg-ink/60 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 outline-none focus:border-brand/60 transition";

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <form onSubmit={submit} className="card-premium rounded-3xl p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo height={38} />
        </div>
        <h1 className="font-display text-2xl text-center mb-1">
          PAINEL <span className="text-brand">ADMIN</span>
        </h1>
        <p className="text-center text-sm text-white/40 mb-6">Acesso do organizador</p>
        <input
          className={input}
          placeholder="Usuário"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoFocus
        />
        <input
          className={`${input} mt-3`}
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-5 w-full py-3 rounded-xl font-bold disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
