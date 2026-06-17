import { prisma } from "./prisma";

// Regras de pontuação (também exibidas na página de Regras):
//  • Placar exato .......... 5 pts
//  • Vencedor/empate certo .. 2 pts
//  • Saldo de gols certo .... +1 pt (bônus, só conta com o vencedor certo)
export const SCORING = {
  exact: 5,
  outcome: 2,
  goalDiff: 1,
} as const;

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/** Pontos de um palpite contra o placar final. */
export function computePoints(
  predHome: number,
  predAway: number,
  finalHome: number,
  finalAway: number
): number {
  if (predHome === finalHome && predAway === finalAway) return SCORING.exact;
  const outcomeOk = sign(predHome - predAway) === sign(finalHome - finalAway);
  if (!outcomeOk) return 0;
  const diffOk = predHome - predAway === finalHome - finalAway;
  return SCORING.outcome + (diffOk ? SCORING.goalDiff : 0);
}

/**
 * Calcula e grava os pontos de todas as previsões de um jogo já encerrado.
 * Idempotente: pode rodar de novo se o placar for corrigido.
 */
export async function scoreGame(gameId: string): Promise<{ scored: number }> {
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Jogo não encontrado.");
  if (game.finalHome === null || game.finalAway === null) {
    throw new Error("O jogo ainda não tem placar final.");
  }

  const preds = await prisma.prediction.findMany({
    where: { gameId },
    select: { id: true, homeScore: true, awayScore: true },
  });

  // agrupa por pontuação para atualizar em poucas queries
  const buckets = new Map<number, string[]>();
  for (const p of preds) {
    const pts = computePoints(p.homeScore, p.awayScore, game.finalHome, game.finalAway);
    const arr = buckets.get(pts) ?? [];
    arr.push(p.id);
    buckets.set(pts, arr);
  }

  const now = new Date();
  for (const [pts, ids] of buckets) {
    await prisma.prediction.updateMany({
      where: { id: { in: ids } },
      data: { points: pts, scoredAt: now },
    });
  }

  await prisma.game.update({ where: { id: gameId }, data: { scoredAt: now } });
  return { scored: preds.length };
}
