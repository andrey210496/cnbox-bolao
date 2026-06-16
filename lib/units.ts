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
  students: number; // alunos cadastrados na unidade
  betsConfirmed: number; // palpites pagos
  betsPending: number; // palpites aguardando pagamento
  betsTotal: number; // todos os palpites (qualquer status)
  revenue: number; // arrecadado (palpites pagos)
  prize: number; // contribuição de prêmio dos palpites pagos
  commission: number; // comissão acumulada (a pagar ao responsável)
  conversion: number; // % pagos / total
  avgTicket: number; // ticket médio dos pagos
  lastBetAt: string | null; // último palpite pago
};

export type UnitsOverview = {
  units: UnitMetric[];
  totals: {
    units: number;
    active: number;
    students: number;
    revenue: number;
    commission: number;
    betsConfirmed: number;
  };
  noUnit: { students: number; betsConfirmed: number; revenue: number; commission: number };
};

const n = (v: number | null | undefined) => v ?? 0;

export async function getUnitsOverview(): Promise<UnitsOverview> {
  const [units, usersByUnit, betsByUnitStatus, lastBetByUnit] = await Promise.all([
    prisma.unit.findMany({ orderBy: { name: "asc" } }),
    prisma.user.groupBy({ by: ["unitId"], _count: { _all: true } }),
    prisma.bet.groupBy({
      by: ["unitId", "status"],
      _count: { _all: true },
      _sum: { amount: true, prizeContribution: true, unitCommission: true },
    }),
    prisma.bet.groupBy({
      by: ["unitId"],
      where: { status: "CONFIRMED" },
      _max: { confirmedAt: true },
    }),
  ]);

  const studentsMap = new Map<string | null, number>();
  for (const u of usersByUnit) studentsMap.set(u.unitId, u._count._all);

  const lastMap = new Map<string | null, Date | null>();
  for (const l of lastBetByUnit) lastMap.set(l.unitId, l._max.confirmedAt ?? null);

  // Agrega palpites por unidade
  type Agg = {
    confirmed: number;
    pending: number;
    total: number;
    revenue: number;
    prize: number;
    commission: number;
  };
  const betMap = new Map<string | null, Agg>();
  const ensure = (k: string | null) => {
    let a = betMap.get(k);
    if (!a) {
      a = { confirmed: 0, pending: 0, total: 0, revenue: 0, prize: 0, commission: 0 };
      betMap.set(k, a);
    }
    return a;
  };
  for (const r of betsByUnitStatus) {
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
    const a = betMap.get(u.id) ?? {
      confirmed: 0,
      pending: 0,
      total: 0,
      revenue: 0,
      prize: 0,
      commission: 0,
    };
    const last = lastMap.get(u.id) ?? null;
    return {
      id: u.id,
      name: u.name,
      slug: u.slug,
      active: u.active,
      holderName: u.holderName,
      holderPhone: u.holderPhone,
      pixKey: u.pixKey,
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
    };
  });

  // Ranking: maior comissão primeiro, depois mais palpites
  units2.sort((x, y) => y.commission - x.commission || y.betsConfirmed - x.betsConfirmed);

  const noUnitAgg = betMap.get(null) ?? {
    confirmed: 0,
    revenue: 0,
    commission: 0,
  } as Agg;

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
