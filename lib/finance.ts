import {
  getBalance,
  getPaymentStatistics,
  listPayments,
  type AsaasStatistics,
} from "./asaas";

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
  balance: number;
  received: AsaasStatistics & { fees: number };
  confirmed: AsaasStatistics & { fees: number }; // pago, aguardando liberação
  pending: AsaasStatistics; // gerado, ainda não pago
  methods: MethodRow[];
  upcoming: CreditBucket[]; // prazos de liberação (cartão)
  feeRate: number; // % médio de tarifa sobre o recebido
};

export type FinanceResult = FinanceOverview | { ok: false; error: string };

const METHODS: { method: string; label: string }[] = [
  { method: "PIX", label: "PIX" },
  { method: "CREDIT_CARD", label: "Crédito" },
  { method: "DEBIT_CARD", label: "Débito" },
];

function withFees(s: AsaasStatistics) {
  return { ...s, fees: round2(s.value - s.netValue) };
}

function round2(n: number) {
  return Math.round((n || 0) * 100) / 100;
}

export async function getFinanceOverview(): Promise<FinanceResult> {
  try {
    const [received, confirmed, pending, balance, pix, credit, debit, upcomingRaw] =
      await Promise.all([
        getPaymentStatistics({ status: "RECEIVED" }),
        getPaymentStatistics({ status: "CONFIRMED" }),
        getPaymentStatistics({ status: "PENDING" }),
        getBalance(),
        getPaymentStatistics({ status: "RECEIVED", billingType: "PIX" }),
        getPaymentStatistics({ status: "RECEIVED", billingType: "CREDIT_CARD" }),
        getPaymentStatistics({ status: "RECEIVED", billingType: "DEBIT_CARD" }),
        // pagamentos pagos aguardando liberação (cartão) → prazos
        listPayments({ status: "CONFIRMED", limit: 100 }).catch(() => ({
          data: [],
          hasMore: false,
          totalCount: 0,
        })),
      ]);

    const byMethod: Record<string, AsaasStatistics> = {
      PIX: pix,
      CREDIT_CARD: credit,
      DEBIT_CARD: debit,
    };
    const methods: MethodRow[] = METHODS.map((m) => {
      const s = byMethod[m.method];
      return {
        method: m.method,
        label: m.label,
        quantity: s.quantity,
        gross: round2(s.value),
        fees: round2(s.value - s.netValue),
        net: round2(s.netValue),
      };
    });

    // Agrupa prazos de liberação por data estimada de crédito
    const buckets = new Map<string, CreditBucket>();
    for (const p of upcomingRaw.data) {
      const d = (p.estimatedCreditDate || p.creditDate || "").slice(0, 10);
      if (!d) continue;
      const b = buckets.get(d) ?? { date: d, quantity: 0, net: 0 };
      b.quantity += 1;
      b.net = round2(b.net + (p.netValue ?? 0));
      buckets.set(d, b);
    }
    const upcoming = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));

    const feeRate =
      received.value > 0 ? round2(((received.value - received.netValue) / received.value) * 100) : 0;

    return {
      ok: true,
      balance: round2(balance),
      received: withFees(received),
      confirmed: withFees(confirmed),
      pending,
      methods,
      upcoming,
      feeRate,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao consultar o Asaas.",
    };
  }
}
