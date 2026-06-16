import { resolveTeam } from "./teams";

const SOURCE =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export type ParsedMatch = {
  homeTeam: string;
  homeCode: string;
  awayTeam: string;
  awayCode: string;
  stage: string | null;
  kickoffAt: Date;
};

function teamString(t: unknown): string {
  if (typeof t === "string") return t;
  if (t && typeof t === "object") {
    const o = t as { name?: string; code?: string };
    return o.name || o.code || "";
  }
  return "";
}

function buildKickoff(date: string, time: unknown): Date | null {
  if (!date) return null;
  const t = String(time ?? "");
  const m = t.match(/(\d{1,2}):(\d{2})/);
  const hh = m ? m[1].padStart(2, "0") : "12";
  const mm = m ? m[2] : "00";
  // Sem fuso confiável na fonte → assume horário de Brasília (-03:00). Admin revisa.
  const d = new Date(`${date}T${hh}:${mm}:00-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Busca e analisa o cronograma da Copa 2026 (fonte aberta openfootball).
 * Retorna apenas partidas com AMBAS as seleções já definidas (ignora "Vencedor do Grupo X" etc.).
 */
export async function fetchWorldCupMatches(): Promise<{
  matches: ParsedMatch[];
  skipped: number;
}> {
  const res = await fetch(SOURCE, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao baixar os jogos (HTTP ${res.status}).`);
  const data = (await res.json()) as {
    rounds?: { name?: string; matches?: unknown[] }[];
    matches?: unknown[];
  };

  const rounds = data.rounds ?? (data.matches ? [{ name: undefined, matches: data.matches }] : []);
  const out: ParsedMatch[] = [];
  let skipped = 0;

  for (const round of rounds) {
    for (const raw of round.matches ?? []) {
      const mm = raw as { date?: string; time?: unknown; team1?: unknown; team2?: unknown; group?: string };
      const home = resolveTeam(teamString(mm.team1));
      const away = resolveTeam(teamString(mm.team2));
      const kickoff = buildKickoff(String(mm.date ?? ""), mm.time);
      if (!home || !away || !kickoff) {
        skipped++;
        continue;
      }
      out.push({
        homeTeam: home.name,
        homeCode: home.code,
        awayTeam: away.name,
        awayCode: away.code,
        stage: mm.group || round.name || null,
        kickoffAt: kickoff,
      });
    }
  }
  return { matches: out, skipped };
}
