import { prisma } from "./prisma";
import { round2 } from "./format";

export type UnitMetric = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  holderName: string | null;
  holderPhone: string | null;
  pixKey: string | null;
  entryFee: number;
  students: number;
  betsConfirmed: number; // entradas pagas
  betsPending: number; // entradas aguardando pagamento
  betsTotal: number;
  revenue: number; // arrecadado (entradas pagas)
  prize: number; // prêmio acumulado da unidade
  commission: number; // comissão acumulada
  conversion: number;
  avgTicket: number;
  lastBetAt: string | null;
  activatedAt: string | null; // quando a taxa de ativação foi confirmada
};

export type UnitsOverview = {
  units: UnitMetric[];
  totals: { units: number; active: number; students: number; revenue: number; commission: number; betsConfirmed: number };
  noUnit: { students: number; betsConfirmed: number; revenue: number; commission: number };
};

const n = (v: number | null | undefined) => v ?? 0;

export async function getUnitsOverview(): Promise<UnitsOverview> {
  const [units, usersByUnit, entriesByUnitStatus, lastByUnit, activByUnit] = await Promise.all([
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.user.groupBy({ by: ["unitId"], _count: { _all: true } }),
    prisma.entry.groupBy({
      by: ["unitId", "status"],
      _count: { _all: true },
      _sum: { amount: true, prizeContribution: true, unitCommission: true },
    }),
    prisma.entry.groupBy({ by: ["unitId"], where: { status: "CONFIRMED" }, _max: { confirmedAt: true } }),
    prisma.unitOrder.groupBy({ by: ["unitId"], where: { status: "CONFIRMED" }, _max: { confirmedAt: true } }),
  ]);

  const studentsMap = new Map<string | null, number>();
  for (const u of usersByUnit) studentsMap.set(u.unitId, u._count._all);
  const lastMap = new Map<string | null, Date | null>();
  for (const l of lastByUnit) lastMap.set(l.unitId, l._max.confirmedAt ?? null);
  const activMap = new Map<string, Date | null>();
  for (const a of activByUnit) activMap.set(a.unitId, a._max.confirmedAt ?? null);

  type Agg = { confirmed: number; pending: number; total: number; revenue: number; prize: number; commission: number };
  const betMap = new Map<string | null, Agg>();
  const ensure = (k: string | null) => {
    let a = betMap.get(k);
    if (!a) { a = { confirmed: 0, pending: 0, total: 0, revenue: 0, prize: 0, commission: 0 }; betMap.set(k, a); }
    return a;
  };
  for (const r of entriesByUnitStatus) {
    const a = ensure(r.unitId);
    const c = r._count._all;
    a.total += c;
    if (r.status === "CONFIRMED") {
      a.confirmed += c;
      a.revenue = round2(a.revenue + n(r._sum.amount));
      a.prize = round2(a.prize + n(r._sum.prizeContribution));
      a.commission = round2(a.commission + n(r._sum.unitCommission));
    } else if (r.status === "PENDING") {
      a.pending += c;
    }
  }

  const units2: UnitMetric[] = units.map((u) => {
    const a = betMap.get(u.id) ?? { confirmed: 0, pending: 0, total: 0, revenue: 0, prize: 0, commission: 0 };
    const last = lastMap.get(u.id) ?? null;
    return {
      id: u.id,
      name: u.name,
      slug: u.slug,
      active: u.active,
      holderName: u.holderName,
      holderPhone: u.holderPhone,
      pixKey: u.pixKey,
      entryFee: u.entryFee,
      students: studentsMap.get(u.id) ?? 0,
      betsConfirmed: a.confirmed,
      betsPending: a.pending,
      betsTotal: a.total,
      revenue: a.revenue,
      prize: a.prize,
      commission: a.commission,
      conversion: a.total > 0 ? round2((a.confirmed / a.total) * 100) : 0,
      avgTicket: a.confirmed > 0 ? round2(a.revenue / a.confirmed) : 0,
      lastBetAt: last ? last.toISOString() : null,
      activatedAt: activMap.get(u.id)?.toISOString() ?? null,
    };
  });

  units2.sort((x, y) => y.commission - x.commission || y.betsConfirmed - x.betsConfirmed);

  const noUnitAgg = betMap.get(null) ?? { confirmed: 0, revenue: 0, commission: 0 } as Agg;

  return {
    units: units2,
    totals: {
      units: units2.length,
      active: units2.filter((u) => u.active).length,
      students: units2.reduce((s, u) => s + u.students, 0),
      revenue: round2(units2.reduce((s, u) => s + u.revenue, 0)),
      commission: round2(units2.reduce((s, u) => s + u.commission, 0)),
      betsConfirmed: units2.reduce((s, u) => s + u.betsConfirmed, 0),
    },
    noUnit: {
      students: studentsMap.get(null) ?? 0,
      betsConfirmed: noUnitAgg.confirmed,
      revenue: round2(noUnitAgg.revenue),
      commission: round2(noUnitAgg.commission),
    },
  };
}
