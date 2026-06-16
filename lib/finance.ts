import { prisma } from "./prisma";
import { round2 } from "./format";

export type MethodRow = {
  method: string;
  label: string;
  quantity: number;
  gross: number;
  fees: number;
  net: number;
};

export type CreditBucket = {
  date: string; // YYYY-MM-DD
  quantity: number;
  net: number;
};

export type FinanceOverview = {
  ok: true;
  gross: number; // arrecadado bruto (palpites + dicas confirmados)
  fees: number; // tarifas do Asaas (onde o líquido é conhecido)
  feesKnownGross: number; // base sobre a qual a tarifa foi medida
  feeRate: number; // % de tarifa
  prizePool: number; // prêmios a distribuir
  commissions: number; // comissões das unidades
  houseGross: number; // casa antes da tarifa (houseCut + dicas)
  houseNet: number; // casa depois da tarifa
  pendingAmount: number;
  pendingCount: number;
  betsCount: number; // palpites confirmados
  specialistCount: number; // dicas vendidas
  specialistTotal: number; // total das dicas (confirmadas)
  methods: MethodRow[];
  upcoming: CreditBucket[];
};

export type FinanceResult = FinanceOverview | { ok: false; error: string };

const METHOD_LABELS: Record<string, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Crédito",
  DEBIT_CARD: "Débito",
};

const num = (v: number | null | undefined) => v ?? 0;

export async function getFinanceOverview(): Promise<FinanceResult> {
  try {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);

    const [
      betsConf,
      betsPend,
      ordersConf,
      ordersPend,
      betsNet,
      ordersNet,
      betsByMethod,
      ordersByMethod,
      betsUpcoming,
      ordersUpcoming,
    ] = await Promise.all([
      prisma.bet.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { amount: true, prizeContribution: true, houseCut: true, unitCommission: true },
        _count: { _all: true },
      }),
      prisma.bet.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.specialistOrder.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.specialistOrder.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.bet.aggregate({
        where: { status: "CONFIRMED", netValue: { not: null } },
        _sum: { amount: true, netValue: true },
      }),
      prisma.specialistOrder.aggregate({
        where: { status: "CONFIRMED", netValue: { not: null } },
        _sum: { amount: true, netValue: true },
      }),
      prisma.bet.groupBy({
        by: ["billingType"],
        where: { status: "CONFIRMED" },
        _sum: { amount: true, netValue: true },
        _count: { _all: true },
      }),
      prisma.specialistOrder.groupBy({
        by: ["billingType"],
        where: { status: "CONFIRMED" },
        _sum: { amount: true, netValue: true },
        _count: { _all: true },
      }),
      prisma.bet.findMany({
        where: { status: "CONFIRMED", estimatedCreditDate: { gte: startToday } },
        select: { estimatedCreditDate: true, netValue: true, amount: true },
      }),
      prisma.specialistOrder.findMany({
        where: { status: "CONFIRMED", estimatedCreditDate: { gte: startToday } },
        select: { estimatedCreditDate: true, netValue: true, amount: true },
      }),
    ]);

    const gross = round2(num(betsConf._sum.amount) + num(ordersConf._sum.amount));
    const prizePool = round2(num(betsConf._sum.prizeContribution));
    const commissions = round2(num(betsConf._sum.unitCommission));
    const specialistTotal = round2(num(ordersConf._sum.amount));
    const houseGross = round2(num(betsConf._sum.houseCut) + specialistTotal);

    const feesKnownGross = round2(num(betsNet._sum.amount) + num(ordersNet._sum.amount));
    const netKnown = round2(num(betsNet._sum.netValue) + num(ordersNet._sum.netValue));
    const fees = round2(feesKnownGross - netKnown);
    const feeRate = feesKnownGross > 0 ? round2((fees / feesKnownGross) * 100) : 0;
    const houseNet = round2(houseGross - fees);

    // Métodos (palpites + dicas)
    const merged = new Map<string, { quantity: number; gross: number; net: number }>();
    const add = (
      bt: string | null,
      qty: number,
      g: number | null,
      n: number | null
    ) => {
      if (!bt) return;
      const cur = merged.get(bt) ?? { quantity: 0, gross: 0, net: 0 };
      cur.quantity += qty;
      cur.gross = round2(cur.gross + num(g));
      cur.net = round2(cur.net + num(n));
      merged.set(bt, cur);
    };
    for (const r of betsByMethod) add(r.billingType, r._count._all, r._sum.amount, r._sum.netValue);
    for (const r of ordersByMethod) add(r.billingType, r._count._all, r._sum.amount, r._sum.netValue);

    const methods: MethodRow[] = ["PIX", "CREDIT_CARD", "DEBIT_CARD"]
      .map((bt) => {
        const m = merged.get(bt);
        if (!m) return null;
        return {
          method: bt,
          label: METHOD_LABELS[bt] ?? bt,
          quantity: m.quantity,
          gross: m.gross,
          fees: round2(m.gross - m.net),
          net: m.net,
        };
      })
      .filter((x): x is MethodRow => x !== null);

    // Prazos de liberação (datas estimadas de crédito)
    const buckets = new Map<string, CreditBucket>();
    const pushUp = (d: Date | null, net: number | null, amount: number) => {
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const b = buckets.get(key) ?? { date: key, quantity: 0, net: 0 };
      b.quantity += 1;
      b.net = round2(b.net + (net ?? amount));
      buckets.set(key, b);
    };
    for (const p of betsUpcoming) pushUp(p.estimatedCreditDate, p.netValue, p.amount);
    for (const p of ordersUpcoming) pushUp(p.estimatedCreditDate, p.netValue, p.amount);
    const upcoming = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));

    return {
      ok: true,
      gross,
      fees,
      feesKnownGross,
      feeRate,
      prizePool,
      commissions,
      houseGross,
      houseNet,
      pendingAmount: round2(num(betsPend._sum.amount) + num(ordersPend._sum.amount)),
      pendingCount: betsPend._count._all + ordersPend._count._all,
      betsCount: betsConf._count._all,
      specialistCount: ordersConf._count._all,
      specialistTotal,
      methods,
      upcoming,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao calcular as métricas.",
    };
  }
}
