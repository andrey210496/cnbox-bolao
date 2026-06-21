"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PredRow = {
  id: string;
  userName: string;
  unitName: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  points: number;
  scored: boolean;
  createdAt: string;
};

export type GameOpt = { id: string; label: string };

export default function PredictionsTable({
  preds,
  games,
  gameId,
}: {
  preds: PredRow[];
  games: GameOpt[];
  gameId: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const shown = q
    ? preds.filter(
        (p) =>
          p.userName.toLowerCase().includes(q) ||
          (p.unitName ?? "").toLowerCase().includes(q)
      )
    : preds;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={gameId}
          onChange={(e) => router.push(e.target.value ? `/admin/palpites?game=${e.target.value}` : "/admin/palpites")}
          className="rounded-xl bg-ink/60 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-brand/60"
        >
          <option value="" className="bg-ink">Todos os jogos</option>
          {games.map((g) => (
            <option key={g.id} value={g.id} className="bg-ink">{g.label}</option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por aluno ou unidade..."
          className="flex-1 min-w-[200px] rounded-xl bg-ink/60 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand/60"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center">Nenhum palpite aqui.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-white/45 text-left text-xs uppercase tracking-wider">
                <th className="py-2 pr-4 font-medium">Aluno</th>
                <th className="py-2 px-4 font-medium">Unidade</th>
                <th className="py-2 px-4 font-medium">Jogo</th>
                <th className="py-2 px-4 font-medium text-center">Palpite</th>
                <th className="py-2 pl-4 font-medium text-right">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="py-3 pr-4">{p.userName}</td>
                  <td className="py-3 px-4 text-white/60">{p.unitName ?? "—"}</td>
                  <td className="py-3 px-4 text-white/70">{p.homeTeam} x {p.awayTeam}</td>
                  <td className="py-3 px-4 text-center font-display text-brand-light tabular-nums">{p.homeScore}-{p.awayScore}</td>
                  <td className="py-3 pl-4 text-right tabular-nums">
                    {p.scored ? <span className="text-brand font-semibold">+{p.points}</span> : <span className="text-white/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
