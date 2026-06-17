"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";

export type EntryRow = {
  id: string;
  userName: string;
  userPhone: string;
  unitName: string | null;
  amount: number;
  status: string;
  billingType: string | null;
  createdAt: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: "Pago", cls: "bg-brand/15 border-brand/40 text-brand" },
  PENDING: { label: "Aguardando", cls: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
  EXPIRED: { label: "Expirado", cls: "bg-white/5 border-white/10 text-white/40" },
  REFUNDED: { label: "Estornado", cls: "bg-white/5 border-white/10 text-white/40" },
};
const METHOD: Record<string, string> = { PIX: "PIX", CREDIT_CARD: "Crédito", DEBIT_CARD: "Débito" };
const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "PENDING", label: "Não pagas" },
  { key: "CONFIRMED", label: "Pagas" },
  { key: "EXPIRED", label: "Expiradas" },
];

export default function EntriesTable({ entries, filter }: { entries: EntryRow[]; filter: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function act(id: string, action: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  }
  async function remove(id: string) {
    if (!confirm("Excluir esta entrada?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/entries/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d?.error ?? "Erro."); }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? entries.filter((b) => b.userName.toLowerCase().includes(q) || b.userPhone.includes(q) || (b.unitName ?? "").toLowerCase().includes(q))
    : entries;

  function setFilter(key: string) {
    router.push(key === "all" ? "/admin/entradas" : `/admin/entradas?status=${key}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${filter === f.key ? "bg-brand/15 border-brand/40 text-brand" : "border-white/10 text-white/55 hover:text-white"}`}>{f.label}</button>
          ))}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, telefone ou unidade..." className="flex-1 min-w-[200px] rounded-xl bg-ink/60 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand/60" />
      </div>

      {shown.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center">Nenhuma entrada aqui.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((b) => {
            const s = STATUS[b.status] ?? STATUS.PENDING;
            return (
              <div key={b.id} className="rounded-2xl bg-ink/40 border border-white/5 p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-[150px] flex-1">
                  <p className="font-medium text-sm">{b.userName}</p>
                  <p className="text-xs text-white/40">{b.userPhone}{b.unitName ? ` · ${b.unitName}` : ""}</p>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-sm tabular-nums text-white/80">{formatBRL(b.amount)}</p>
                  {b.billingType && <p className="text-xs text-white/40">{METHOD[b.billingType] ?? b.billingType}</p>}
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button onClick={() => act(b.id, "recheck")} disabled={busy === b.id} className="rounded-lg glass px-2.5 py-1.5 text-xs text-white/70 hover:text-brand disabled:opacity-40">↻ Verificar</button>
                  {b.status !== "CONFIRMED" && <button onClick={() => act(b.id, "confirm")} disabled={busy === b.id} className="rounded-lg glass px-2.5 py-1.5 text-xs text-brand hover:text-brand-light disabled:opacity-40">✓ Confirmar</button>}
                  {b.status === "PENDING" && <button onClick={() => act(b.id, "expire")} disabled={busy === b.id} className="rounded-lg glass px-2.5 py-1.5 text-xs text-white/50 hover:text-white disabled:opacity-40">Expirar</button>}
                  <button onClick={() => remove(b.id)} disabled={busy === b.id} className="rounded-lg glass px-2.5 py-1.5 text-xs text-red-300/80 hover:text-red-300 disabled:opacity-40">🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
