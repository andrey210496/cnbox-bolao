import { prisma } from "./prisma";
import { generateGameAnalysis } from "./ai";

/** O usuário tem acesso ao Especialista para este jogo? (pedido confirmado) */
export async function hasSpecialistAccess(
  userId: string,
  gameId: string
): Promise<boolean> {
  const order = await prisma.specialistOrder.findFirst({
    where: { userId, gameId, status: "CONFIRMED" },
    select: { id: true },
  });
  return Boolean(order);
}

/** Retorna a análise do jogo (gera e cacheia na 1ª vez). */
export async function getOrCreateAnalysis(gameId: string): Promise<string> {
  const cached = await prisma.gameAnalysis.findUnique({ where: { gameId } });
  if (cached) return cached.content;

  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) throw new Error("Jogo não encontrado.");

  const { content, model } = await generateGameAnalysis({
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    competition: game.competition,
    stage: game.stage,
    kickoffAt: game.kickoffAt,
    notes: game.notes,
  });

  // upsert para evitar corrida de duas gerações simultâneas
  const saved = await prisma.gameAnalysis.upsert({
    where: { gameId },
    update: {},
    create: { gameId, content, model },
  });
  return saved.content;
}
