"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CleanupInactiveUnits({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (
      !confirm(
        `Excluir ${count} unidade(s) inativa(s) de vez? Os alunos/palpites delas ficam "sem unidade". Não dá pra desfazer.`
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/units/cleanup", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      alert(`${d.deleted} unidade(s) excluída(s).`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(false);
    }
  }

  if (count <= 0) return null;

  return (
    <button
      onClick={run}
      disabled={busy}
      className="rounded-xl glass px-4 py-2.5 text-sm font-semibold text-red-300/90 hover:text-red-300 disabled:opacity-50"
    >
      {busy ? "Excluindo..." : `🗑 Excluir ${count} inativa(s)`}
    </button>
  );
}
