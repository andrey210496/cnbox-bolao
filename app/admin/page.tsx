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

  const games = await prisma.game.findMany({ orderBy: { kickoffAt: "asc" } });
  const betAgg = await prisma.bet.groupBy({
    by: ["gameId"],
    where: { status: "CONFIRMED" },
    _sum: { prizeContribution: true, amount: true },
    _count: { _all: true },
  });
  const betMap = new Map(betAgg.map((a) => [a.gameId, a]));

  const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
  const unitAgg = await prisma.bet.groupBy({
    by: ["unitId"],
    where: { status: "CONFIRMED" },
    _sum: { unitCommission: true, amount: true },
    _count: { _all: true },
  });
  const unitMap = new Map(unitAgg.map((a) => [a.unitId, a]));

  const usersCount = await prisma.user.count();
  const totals = await prisma.bet.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { amount: true, prizeContribution: true, houseCut: true, unitCommission: true },
    _count: { _all: true },
  });

  const gamesData = games.map((g) => {
    const a = betMap.get(g.id);
    return {
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
      payoutStatus: g.payoutStatus,
      bets: a?._count._all ?? 0,
      pool: a?._sum.prizeContribution ?? 0,
      arrecadado: a?._sum.amount ?? 0,
    };
  });

  const unitsData = units.map((u) => {
    const a = unitMap.get(u.id);
    return {
      id: u.id,
      name: u.name,
      slug: u.slug,
      active: u.active,
      bets: a?._count._all ?? 0,
      commission: a?._sum.unitCommission ?? 0,
      arrecadado: a?._sum.amount ?? 0,
    };
  });

  const stats = {
    users: usersCount,
    bets: totals._count._all,
    arrecadado: totals._sum.amount ?? 0,
    prize: totals._sum.prizeContribution ?? 0,
    house: (totals._sum.houseCut ?? 0) - (totals._sum.unitCommission ?? 0),
    commissions: totals._sum.unitCommission ?? 0,
  };

  return (
    <AdminDashboard
      stats={stats}
      games={gamesData}
      units={unitsData}
      eco={eco}
      teams={TEAMS}
    />
  );
}
