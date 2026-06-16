import { prisma } from "./prisma";
import { generateGameAnalysis } from "./ai";

// CPFs com acesso liberado de cortesia (ex: dono/equipe), separados por vírgula
// na env SPECIALIST_FREE_CPFS. Ex: "12345678900,98765432100".
function freeCpfs(): string[] {
  return (process.env.SPECIALIST_FREE_CPFS || "")
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
}

/** CPF de cortesia (dono/equipe) — dicas ilimitadas, sem consumir. */
async function isFreeUser(userId: string): Promise<boolean> {
  const free = freeCpfs();
  if (!free.length) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cpf: true },
  });
  return Boolean(user && free.includes(user.cpf));
}

/** O usuário tem uma dica DISPONÍVEL (paga e ainda não usada) para este jogo? */
export async function hasUnusedDica(
  userId: string,
  gameId: string
): Promise<boolean> {
  if (await isFreeUser(userId)) return true;
  const order = await prisma.specialistOrder.findFirst({
    where: { userId, gameId, status: "CONFIRMED", usedAt: null },
    select: { id: true },
  });
  return Boolean(order);
}

/**
 * Consome UMA dica e retorna o conteúdo. Uso único: marca o pedido como usado.
 * CPF de cortesia não consome (uso ilimitado). Lança erro se não houver dica disponível.
 */
export async function consumeDica(
  userId: string,
  gameId: string
): Promise<string> {
  if (await isFreeUser(userId)) {
    return getOrCreateAnalysis(gameId);
  }

  // pega a dica paga mais antiga ainda não usada
  const order = await prisma.specialistOrder.findFirst({
    where: { userId, gameId, status: "CONFIRMED", usedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!order) {
    throw new Error("Você não tem uma dica disponível para este jogo.");
  }

  const content = await getOrCreateAnalysis(gameId);
  // marca como usada só depois de gerar com sucesso (não cobra à toa)
  await prisma.specialistOrder.update({
    where: { id: order.id },
    data: { usedAt: new Date() },
  });
  return content;
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
