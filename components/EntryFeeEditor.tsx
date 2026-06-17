"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EntryFeeEditor({ value }: { value: number }) {
  const router = useRouter();
  const [fee, setFee] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/units/fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryFee: Number(fee) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro.");
      setMsg("✅ Valor salvo!");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="block text-xs text-white/50 mb-1">Valor da entrada (mín. R$50)</label>
        <div className="flex items-center gap-1">
          <span className="text-white/50">R$</span>
          <input
            type="number"
            min={50}
            step="1"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            className="w-28 rounded-xl bg-ink/60 border border-white/10 px-3 py-2 text-white outline-none focus:border-brand/60"
          />
        </div>
      </div>
      <button onClick={save} disabled={busy} className="btn-primary rounded-xl px-4 py-2 font-semibold disabled:opacity-50">
        {busy ? "Salvando..." : "Salvar"}
      </button>
      {msg && <span className="text-xs text-white/60">{msg}</span>}
    </div>
  );
}
