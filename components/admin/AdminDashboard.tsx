"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { formatBRL } from "@/lib/format";

type Team = { name: string; code: string };
type Game = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  stage: string | null;
  kickoffAt: string;
  status: string;
  finalHome: number | null;
  finalAway: number | null;
  payoutStatus: string;
  bets: number;
  pool: number;
  arrecadado: number;
};
type Unit = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  bets: number;
  commission: number;
  arrecadado: number;
  holderName: string | null;
  holderPhone: string | null;
  pixKey: string | null;
};
type Eco = Record<string, number>;

export default function AdminDashboard({
  stats,
  games,
  units,
  eco,
  teams,
}: {
  stats: Record<string, number>;
  games: Game[];
  units: Unit[];
  eco: Eco;
  teams: Team[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1300px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo height={28} />
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              Admin
            </span>
          </div>
          <button
            onClick={logout}
            className="text-sm text-white/50 hover:text-white px-3 py-2 rounded-lg glass"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Stat label="Usuários" value={String(stats.users)} />
          <Stat label="Palpites" value={String(stats.bets)} />
          <Stat label="Arrecadado" value={formatBRL(stats.arrecadado)} accent />
          <Stat label="Em prêmios" value={formatBRL(stats.prize)} />
          <Stat label="Casa (líq.)" value={formatBRL(stats.house)} accent />
          <Stat label="Comissões" value={formatBRL(stats.commissions)} />
        </div>

        <Games games={games} teams={teams} onChange={refresh} />
        <Units units={units} unitPercent={eco.unit_percent} onChange={refresh} />
        <Config eco={eco} onChange={refresh} />
      </div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-premium rounded-2xl p-4 text-center">
      <p className={`font-display text-xl tabular-nums ${accent ? "text-brand text-glow" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{label}</p>
    </div>
  );
}

/* ---------------- JOGOS ---------------- */
function Games({ games, teams, onChange }: { games: Game[]; teams: Team[]; onChange: () => void }) {
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [stage, setStage] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setMsg(null);
    const res = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeCode: home, awayCode: away, kickoffAt: kickoff, stage }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setHome(""); setAway(""); setKickoff(""); setStage("");
      onChange();
    } else setMsg(d?.error ?? "Erro.");
  }

  const [importing, setImporting] = useState(false);
  async function importGames() {
    if (!confirm("Importar os jogos da Copa 2026 automaticamente? (não duplica os já cadastrados)")) return;
    setImporting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/games/import", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error ?? "Erro ao importar.");
      setMsg(`✅ ${d.created} criados · ${d.updated ?? 0} horários corrigidos · ${d.duplicates} sem mudança${d.skipped ? ` · ${d.skipped} ignorados (a definir)` : ""}.`);
      onChange();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro.");
    } finally {
      setImporting(false);
    }
  }

  const sel = "rounded-xl bg-ink/60 border border-white/10 px-3 py-2.5 text-white outline-none focus:border-brand/60";

  return (
    <section className="card-premium rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-2xl">JOGOS <span className="text-brand">DA COPA</span></h2>
        <button
          onClick={importGames}
          disabled={importing}
          className="rounded-xl glass px-4 py-2.5 text-sm font-semibold text-brand hover:text-brand-light disabled:opacity-50"
        >
          {importing ? "Importando..." : "⬇ Importar jogos da Copa"}
        </button>
      </div>

      <div className="grid sm:grid-cols-5 gap-2 mb-5">
        <select className={sel} value={home} onChange={(e) => setHome(e.target.value)}>
          <option value="">Mandante</option>
          {teams.map((t) => <option key={t.code} value={t.code} className="bg-ink">{t.name}</option>)}
        </select>
        <select className={sel} value={away} onChange={(e) => setAway(e.target.value)}>
          <option value="">Visitante</option>
          {teams.map((t) => <option key={t.code} value={t.code} className="bg-ink">{t.name}</option>)}
        </select>
        <input className={sel} type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} />
        <input className={sel} placeholder="Fase (opcional)" value={stage} onChange={(e) => setStage(e.target.value)} />
        <button onClick={create} className="btn-primary rounded-xl font-bold px-4 py-2.5">+ Criar jogo</button>
      </div>
      {msg && <p className="text-sm text-red-400 mb-3">{msg}</p>}

      <div className="space-y-2">
        {games.length === 0 && <p className="text-white/40 text-sm">Nenhum jogo cadastrado.</p>}
        {games.map((g) => <GameRow key={g.id} g={g} onChange={onChange} />)}
      </div>
    </section>
  );
}

function GameRow({ g, onChange }: { g: Game; onChange: () => void }) {
  const [fh, setFh] = useState(g.finalHome?.toString() ?? "");
  const [fa, setFa] = useState(g.finalAway?.toString() ?? "");
  const [busy, setBusy] = useState(false);

  async function call(body: object) {
    setBusy(true);
    await fetch(`/api/admin/games/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    onChange();
  }
  async function del() {
    if (!confirm("Excluir este jogo?")) return;
    const res = await fetch(`/api/admin/games/${g.id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d?.error ?? "Erro"); }
    onChange();
  }

  const date = new Date(g.kickoffAt).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="rounded-2xl bg-ink/40 border border-white/5 p-3 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[180px]">
        <p className="font-medium">{g.homeTeam} <span className="text-white/30">x</span> {g.awayTeam}</p>
        <p className="text-xs text-white/40">{date} · {g.bets} palpites · {formatBRL(g.pool)} em prêmio · <span className="uppercase">{g.status}</span></p>
      </div>

      <div className="flex items-center gap-1.5">
        <input className="w-12 h-9 rounded-lg bg-ink/70 border border-white/10 text-center tabular-nums" inputMode="numeric" value={fh} onChange={(e) => setFh(e.target.value)} placeholder="-" />
        <span className="text-white/30">x</span>
        <input className="w-12 h-9 rounded-lg bg-ink/70 border border-white/10 text-center tabular-nums" inputMode="numeric" value={fa} onChange={(e) => setFa(e.target.value)} placeholder="-" />
        <button disabled={busy || fh === "" || fa === ""} onClick={() => call({ action: "result", finalHome: Number(fh), finalAway: Number(fa) })} className="btn-primary rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40">Lançar placar</button>
      </div>

      <div className="flex items-center gap-1.5">
        {g.status === "FINISHED" && (
          <a href={`/admin/apuracao/${g.id}`} className="rounded-lg glass px-3 py-2 text-xs text-brand hover:text-brand-light">Apurar →</a>
        )}
        {g.status === "SCHEDULED" ? (
          <button onClick={() => call({ action: "status", status: "CLOSED" })} className="rounded-lg glass px-3 py-2 text-xs text-white/60">Fechar</button>
        ) : g.status === "CLOSED" ? (
          <button onClick={() => call({ action: "status", status: "SCHEDULED" })} className="rounded-lg glass px-3 py-2 text-xs text-white/60">Reabrir</button>
        ) : null}
        {g.bets === 0 && (
          <button onClick={del} className="rounded-lg glass px-3 py-2 text-xs text-red-300/70 hover:text-red-300">Excluir</button>
        )}
      </div>
    </div>
  );
}

/* ---------------- UNIDADES ---------------- */
function Units({ units, unitPercent, onChange }: { units: Unit[]; unitPercent: number; onChange: () => void }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function create() {
    setMsg(null);
    const res = await fetch("/api/admin/units", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setName(""); onChange(); } else setMsg(d?.error ?? "Erro.");
  }
  async function toggle(u: Unit) {
    await fetch("/api/admin/units", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    });
    onChange();
  }

  return (
    <section className="card-premium rounded-3xl p-6">
      <h2 className="font-display text-2xl mb-1">UNIDADES</h2>
      <p className="text-sm text-white/50 mb-4">
        Cada unidade tem um link de indicação. Comissão: {unitPercent}% do que a unidade arrecadar (palpites pagos).
      </p>

      <div className="flex gap-2 mb-5">
        <input className="flex-1 rounded-xl bg-ink/60 border border-white/10 px-3 py-2.5 text-white outline-none focus:border-brand/60" placeholder="Nome da unidade" value={name} onChange={(e) => setName(e.target.value)} />
        <button onClick={create} className="btn-primary rounded-xl font-bold px-4 py-2.5">+ Criar</button>
      </div>
      {msg && <p className="text-sm text-red-400 mb-3">{msg}</p>}

      <div className="space-y-2">
        {units.length === 0 && <p className="text-white/40 text-sm">Nenhuma unidade.</p>}
        {units.map((u) => (
          <div key={u.id} className="rounded-2xl bg-ink/40 border border-white/5 p-3 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[160px]">
              <p className="font-medium">{u.name} {!u.active && <span className="text-xs text-white/30">(inativa)</span>}</p>
              <p className="text-xs text-white/40">{u.bets} palpites · comissão {formatBRL(u.commission)}</p>
              {u.holderName ? (
                <p className="text-xs text-white/40 mt-0.5">
                  Resp.: {u.holderName}
                  {u.holderPhone ? ` · ${u.holderPhone}` : ""}
                  {u.pixKey ? ` · PIX: ${u.pixKey}` : ""}
                </p>
              ) : (
                <p className="text-xs text-amber-300/70 mt-0.5">Sem responsável cadastrado</p>
              )}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`${origin}/u/${u.slug}`)}
              className="rounded-lg glass px-3 py-2 text-xs text-brand hover:text-brand-light"
              title="Copiar link de indicação"
            >
              Copiar link
            </button>
            <button onClick={() => toggle(u)} className="rounded-lg glass px-3 py-2 text-xs text-white/60">
              {u.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CONFIG ---------------- */
function Config({ eco, onChange }: { eco: Eco; onChange: () => void }) {
  const [form, setForm] = useState({
    bet_price: String(eco.bet_price),
    house_percent: String(eco.house_percent),
    unit_percent: String(eco.unit_percent),
    payout_deadline_hours: String(eco.payout_deadline_hours),
    specialist_price: String(eco.specialist_price),
  });
  const [msg, setMsg] = useState<string | null>(null);
  const prize = Math.max(0, 100 - Number(form.house_percent || 0) - Number(form.unit_percent || 0));

  async function save() {
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Salvo!" : d?.error ?? "Erro.");
    if (res.ok) onChange();
  }

  const field = (key: keyof typeof form, label: string) => (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <input
        className="w-full rounded-xl bg-ink/60 border border-white/10 px-3 py-2.5 text-white tabular-nums outline-none focus:border-brand/60"
        inputMode="decimal"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <section className="card-premium rounded-3xl p-6">
      <h2 className="font-display text-2xl mb-1">CONFIGURAÇÃO</h2>
      <p className="text-sm text-white/50 mb-4">
        Tudo em %. Prêmio = 100 − casa − unidade ={" "}
        <strong className="text-brand">{prize}%</strong>. Assim a casa nunca paga
        do bolso.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {field("bet_price", "Valor do palpite (R$)")}
        {field("house_percent", "% da casa (lucro)")}
        {field("unit_percent", "% da unidade")}
        {field("payout_deadline_hours", "Prazo pagamento (h)")}
        {field("specialist_price", "Especialista IA (R$)")}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="btn-primary rounded-xl font-bold px-6 py-2.5">Salvar</button>
        {prize <= 0 && <span className="text-sm text-red-400">Casa + unidade não pode passar de 100%.</span>}
        {msg && <span className="text-sm text-brand-light">{msg}</span>}
      </div>
    </section>
  );
}
