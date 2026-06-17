import { prisma } from "./prisma";
import { round2 } from "./format";

export type WinnerShare = {
  betId: string;
  userId: string;
  name: string;
  pixKey: string;
  pixKeyType: string;
  amount: number;
};

export type PayoutPreview = {
  gameId: string;
  pool: number; // prêmio total (80%)
  count: number; // nº de ganhadores
  winners: WinnerShare[];
};

/**
 * Calcula os ganhadores (placar exato, palpites confirmados) e a cota de cada um.
 * Distribui os centavos restantes para não sobrar nem faltar do prêmio.
 */
export async function computePayoutPreview(gameId: string): Promise<PayoutPreview> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Jogo não encontrado.");
  if (game.status !== "FINISHED" || game.finalHome === null || game.finalAway === null) {
    throw new Error("O jogo ainda não teve o placar final lançado.");
  }

  // BOLÃO POR UNIDADE: cada unidade é um bolão separado.
  // Prêmio da unidade = soma das contribuições (80%) dos confirmados DAQUELA unidade,
  // dividido só entre os ganhadores DAQUELA unidade. Unidade sem ganhador não paga
  // (o prêmio dela fica com a casa). null = "sem unidade", concorre entre si.
  const bets = await prisma.bet.findMany({
    where: { gameId, status: "CONFIRMED" },
    select: {
      id: true,
      userId: true,
      unitId: true,
      homeScore: true,
      awayScore: true,
      prizeContribution: true,
      user: { select: { fullName: true, pixKey: true, pixKeyType: true } },
    },
    orderBy: { confirmedAt: "asc" },
  });

  const groups = new Map<string | null, typeof bets>();
  for (const b of bets) {
    const arr = groups.get(b.unitId) ?? [];
    arr.push(b);
    groups.set(b.unitId, arr);
  }

  let pool = 0; // prêmio total gerado (todas as unidades, referência)
  const winners: WinnerShare[] = [];

  for (const groupBets of groups.values()) {
    const groupPool = round2(
      groupBets.reduce((s, b) => s + (b.prizeContribution ?? 0), 0)
    );
    pool = round2(pool + groupPool);

    const groupWinners = groupBets.filter(
      (b) => b.homeScore === game.finalHome && b.awayScore === game.finalAway
    );
    const count = groupWinners.length;
    if (count === 0 || groupPool <= 0) continue;

    const baseCents = Math.floor((groupPool * 100) / count);
    let remainder = Math.round(groupPool * 100) - baseCents * count;
    for (const b of groupWinners) {
      let cents = baseCents;
      if (remainder > 0) {
        cents += 1;
        remainder -= 1;
      }
      winners.push({
        betId: b.id,
        userId: b.userId,
        name: b.user.fullName,
        pixKey: b.user.pixKey,
        pixKeyType: b.user.pixKeyType,
        amount: cents / 100,
      });
    }
  }

  return { gameId, pool, count: winners.length, winners };
}
