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

/** O usuário tem acesso ao Especialista para este jogo? (pedido confirmado ou cortesia) */
export async function hasSpecialistAccess(
  userId: string,
  gameId: string
): Promise<boolean> {
  // Cortesia: CPFs liberados acessam o chat de qualquer jogo, sem pagar.
  const free = freeCpfs();
  if (free.length) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { cpf: true },
    });
    if (user && free.includes(user.cpf)) return true;
  }

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
