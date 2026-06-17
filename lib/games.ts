import { prisma } from "./prisma";

export type GameLite = {
  id: string;
  homeTeam: string;
  homeCode: string;
  awayTeam: string;
  awayCode: string;
  competition: string;
  stage: string | null;
  kickoffAt: Date;
  status: string;
  finalHome: number | null;
  finalAway: number | null;
};

export function isOpen(g: { status: string; kickoffAt: Date }): boolean {
  return g.status === "SCHEDULED" && Date.now() < new Date(g.kickoffAt).getTime();
}

/** Lista os jogos (sem pool — no modelo de liga o prêmio é por unidade, não por jogo). */
export async function listGames(): Promise<GameLite[]> {
  const games = await prisma.game.findMany({
    where: { status: { in: ["SCHEDULED", "CLOSED", "FINISHED"] } },
    orderBy: { kickoffAt: "asc" },
  });
  return games.map((g) => ({
    id: g.id,
    homeTeam: g.homeTeam,
    homeCode: g.homeCode,
    awayTeam: g.awayTeam,
    awayCode: g.awayCode,
    competition: g.competition,
    stage: g.stage,
    kickoffAt: g.kickoffAt,
    status: g.status,
    finalHome: g.finalHome,
    finalAway: g.finalAway,
  }));
}

export function formatGameDate(d: Date): string {
  return new Date(d).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}
