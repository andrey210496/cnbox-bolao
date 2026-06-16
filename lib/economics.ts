import { prisma } from "./prisma";
import { round2 } from "./format";

export { formatBRL } from "./format";

// Valores padrão (editáveis pelo admin via tabela Setting).
// MODELO 100% PERCENTUAL — a casa nunca paga do bolso, nunca perde.
export const DEFAULTS = {
  bet_price: 10, // R$ por palpite
  house_percent: 20, // % da casa (lucro líquido garantido)
  unit_percent: 10, // % pago à unidade que trouxe o palpite (do valor do palpite)
  payout_deadline_hours: 24, // prazo de apuração/pagamento informado ao usuário
  specialist_price: 9.9, // R$ do Especialista IA (100% da casa, fora do prêmio)
} as const;

export type EconomicsKey = keyof typeof DEFAULTS;

/** % do prêmio = o que sobra (sempre derivado, nunca negativo). */
export function prizePercent(housePercent: number, unitPercent: number): number {
  return Math.max(0, 100 - housePercent - unitPercent);
}

/** Lê as configurações econômicas do banco, caindo nos padrões. */
export async function getEconomics() {
  let rows: { key: string; value: string }[] = [];
  try {
    rows = await prisma.setting.findMany({
      where: { key: { in: Object.keys(DEFAULTS) } },
    });
  } catch {
    // banco indisponível -> usa padrões
  }
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  const out = { ...DEFAULTS } as Record<EconomicsKey, number>;
  for (const k of Object.keys(DEFAULTS) as EconomicsKey[]) {
    if (map[k] !== undefined && !Number.isNaN(map[k])) out[k] = map[k];
  }
  return out;
}

/**
 * Divide o valor de um palpite — TUDO percentual:
 * - prizeContribution: prêmio (% = 100 − casa − unidade)
 * - unitCommission: comissão da unidade (unit_percent%), só se houver unidade
 * - houseCut: o que sobra pra casa (absorve a fatia da unidade quando não há unidade)
 *
 * Garantia: como cada fatia é % do valor já pago, a casa nunca fica no vermelho.
 */
export function splitAmount(
  amount: number,
  housePercent: number,
  unitPercent: number,
  hasUnit: boolean
) {
  const pPct = prizePercent(housePercent, unitPercent);
  const prizeContribution = round2((amount * pPct) / 100);
  const unitCommission = hasUnit ? round2((amount * unitPercent) / 100) : 0;
  const houseCut = round2(amount - prizeContribution - unitCommission);
  return { prizeContribution, houseCut, unitCommission };
}
