import { prisma } from "./prisma";
import { round2 } from "./format";

export type Standing = {
  userId: string;
  name: string;
  points: number;
  exact: number; // nº de placares exatos (desempate)
  predictions: number; // nº de palpites feitos
  rank: number;
};

/** Prêmio acumulado da unidade = soma das contribuições das entradas confirmadas. */
export async function getUnitPool(unitId: string | null): Promise<number> {
  const agg = await prisma.entry.aggregate({
    where: { unitId, status: "CONFIRMED" },
    _sum: { prizeContribution: true },
  });
  return round2(agg._sum.prizeContribution ?? 0);
}

/**
 * Classificação da unidade: participantes (entrada confirmada) ordenados por
 * pontos. Desempate: mais placares exatos, depois entrada mais antiga.
 */
export async function getUnitStandings(unitId: string | null): Promise<Standing[]> {
  const entries = await prisma.entry.findMany({
    where: { unitId, status: "CONFIRMED" },
    select: { userId: true, confirmedAt: true, user: { select: { fullName: true } } },
  });
  if (entries.length === 0) return [];

  const userIds = entries.map((e) => e.userId);

  const [pointsAgg, exactAgg, countAgg] = await Promise.all([
    prisma.prediction.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _sum: { points: true },
    }),
    prisma.prediction.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, points: 5 },
      _count: { _all: true },
    }),
    prisma.prediction.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    }),
  ]);

  const pts = new Map(pointsAgg.map((p) => [p.userId, p._sum.points ?? 0]));
  const exact = new Map(exactAgg.map((p) => [p.userId, p._count._all]));
  const cnt = new Map(countAgg.map((p) => [p.userId, p._count._all]));
  const since = new Map(entries.map((e) => [e.userId, e.confirmedAt?.getTime() ?? 0]));

  const rows = entries
    .map((e) => ({
      userId: e.userId,
      name: e.user.fullName,
      points: pts.get(e.userId) ?? 0,
      exact: exact.get(e.userId) ?? 0,
      predictions: cnt.get(e.userId) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.exact - a.exact ||
        (since.get(a.userId)! - since.get(b.userId)!)
    );

  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

/** Resumo do bolão da unidade para um usuário específico. */
export async function getUnitSummaryForUser(
  userId: string,
  unitId: string | null
): Promise<{ pool: number; total: number; myPoints: number; myRank: number | null }> {
  const [pool, standings] = await Promise.all([
    getUnitPool(unitId),
    getUnitStandings(unitId),
  ]);
  const me = standings.find((s) => s.userId === userId);
  return {
    pool,
    total: standings.length,
    myPoints: me?.points ?? 0,
    myRank: me?.rank ?? null,
  };
}
