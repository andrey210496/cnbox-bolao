import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { isOpen } from "@/lib/games";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

// POST: cria/atualiza o palpite (grátis) do usuário num jogo. Editável até o início.
export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  maybeSweep();
  if (!rateLimit(`pred:${uid}`, 60, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas alterações. Aguarde um instante." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const gameId = String(body?.gameId ?? "");
    const homeScore = Number(body?.homeScore);
    const awayScore = Number(body?.awayScore);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0 ||
      homeScore > 30 ||
      awayScore > 30
    ) {
      return NextResponse.json({ error: "Placar inválido." }, { status: 400 });
    }

    // Precisa ter ENTRADA confirmada
    const entry = await prisma.entry.findFirst({
      where: { userId: uid, status: "CONFIRMED" },
      select: { id: true },
    });
    if (!entry)
      return NextResponse.json(
        { error: "Entre no bolão (pagamento único) para palpitar.", needEntry: true },
        { status: 403 }
      );

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
    if (!isOpen(game))
      return NextResponse.json({ error: "Os palpites deste jogo estão encerrados." }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { unitId: true },
    });

    await prisma.prediction.upsert({
      where: { userId_gameId: { userId: uid, gameId } },
      update: { homeScore, awayScore },
      create: { userId: uid, gameId, unitId: user?.unitId ?? null, homeScore, awayScore },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar o palpite.";
    console.error("[predictions] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
