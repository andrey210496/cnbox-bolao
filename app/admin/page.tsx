import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomics } from "@/lib/economics";
import { TEAMS } from "@/lib/teams";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin />;

  const eco = await getEconomics();

  const [games, units, usersCount, predCount, totals] = await Promise.all([
    prisma.game.findMany({ orderBy: { kickoffAt: "asc" } }),
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.user.count(),
    prisma.prediction.count(),
    prisma.entry.aggregate({
      where: { status: "CONFIRMED" },
      _sum: { amount: true, prizeContribution: true, houseCut: true, unitCommission: true },
      _count: { _all: true },
    }),
  ]);

  const unitAgg = await prisma.entry.groupBy({
    by: ["unitId"],
    where: { status: "CONFIRMED" },
    _sum: { unitCommission: true, amount: true },
    _count: { _all: true },
  });
  const unitMap = new Map(unitAgg.map((a) => [a.unitId, a]));

  const gamesData = games.map((g) => ({
    id: g.id,
    homeTeam: g.homeTeam,
    awayTeam: g.awayTeam,
    homeCode: g.homeCode,
    awayCode: g.awayCode,
    stage: g.stage,
    kickoffAt: g.kickoffAt.toISOString(),
    status: g.status,
    finalHome: g.finalHome,
    finalAway: g.finalAway,
  }));

  const unitsData = units.map((u) => {
    const a = unitMap.get(u.id);
    return {
      id: u.id,
      name: u.name,
      slug: u.slug,
      active: u.active,
      entryFee: u.entryFee,
      entries: a?._count._all ?? 0,
      commission: a?._sum.unitCommission ?? 0,
      arrecadado: a?._sum.amount ?? 0,
      holderName: u.holderName,
      holderPhone: u.holderPhone,
      pixKey: u.pixKey,
    };
  });

  const stats = {
    users: usersCount,
    entries: totals._count._all,
    predictions: predCount,
    arrecadado: totals._sum.amount ?? 0,
    prize: totals._sum.prizeContribution ?? 0,
    house: totals._sum.houseCut ?? 0,
    commissions: totals._sum.unitCommission ?? 0,
  };

  return <AdminDashboard stats={stats} games={gamesData} units={unitsData} eco={eco} teams={TEAMS} />;
}
