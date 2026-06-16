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

  // Prêmio total = soma das contribuições (80%) de todos os confirmados
  const poolAgg = await prisma.bet.aggregate({
    where: { gameId, status: "CONFIRMED" },
    _sum: { prizeContribution: true },
  });
  const pool = round2(poolAgg._sum.prizeContribution ?? 0);

  const winningBets = await prisma.bet.findMany({
    where: {
      gameId,
      status: "CONFIRMED",
      homeScore: game.finalHome,
      awayScore: game.finalAway,
    },
    include: {
      user: { select: { fullName: true, pixKey: true, pixKeyType: true } },
    },
    orderBy: { confirmedAt: "asc" },
  });

  const count = winningBets.length;
  const winners: WinnerShare[] = [];

  if (count > 0 && pool > 0) {
    const baseCents = Math.floor((pool * 100) / count); // centavos por ganhador
    let remainder = Math.round(pool * 100) - baseCents * count; // centavos a distribuir
    for (const b of winningBets) {
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

  return { gameId, pool, count, winners };
}
