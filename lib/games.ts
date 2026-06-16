import { prisma } from "./prisma";

export type GameWithPool = {
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
  pool: number; // prêmio acumulado (80%)
  arrecadado: number; // total pago
  bets: number; // palpites confirmados
};

export function isOpen(g: { status: string; kickoffAt: Date }): boolean {
  return g.status === "SCHEDULED" && Date.now() < new Date(g.kickoffAt).getTime();
}

/** Lista jogos com prêmio acumulado e arrecadação (apenas palpites confirmados). */
export async function listGamesWithPools(): Promise<GameWithPool[]> {
  const games = await prisma.game.findMany({
    where: { status: { in: ["SCHEDULED", "CLOSED", "FINISHED"] } },
    orderBy: { kickoffAt: "asc" },
  });
  if (games.length === 0) return [];

  const agg = await prisma.bet.groupBy({
    by: ["gameId"],
    where: { status: "CONFIRMED" },
    _sum: { prizeContribution: true, amount: true },
    _count: { _all: true },
  });
  const map = new Map(agg.map((a) => [a.gameId, a]));

  return games.map((g) => {
    const a = map.get(g.id);
    return {
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
      pool: a?._sum.prizeContribution ?? 0,
      arrecadado: a?._sum.amount ?? 0,
      bets: a?._count._all ?? 0,
    };
  });
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
