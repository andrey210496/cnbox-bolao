import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { scoreGame } from "@/lib/scoring";

// PATCH: lança placar final (e calcula os pontos), muda status, ajusta horário.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });

  const data: Record<string, unknown> = {};

  // Lançar placar final -> marca FINISHED e calcula os pontos das previsões
  if (b?.action === "result") {
    const home = Number(b?.finalHome);
    const away = Number(b?.finalAway);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      return NextResponse.json({ error: "Placar inválido." }, { status: 400 });
    }
    await prisma.game.update({
      where: { id },
      data: { finalHome: home, finalAway: away, status: "FINISHED", finishedAt: new Date() },
    });
    const { scored } = await scoreGame(id);
    await prisma.auditLog
      .create({
        data: {
          action: "game_result",
          actor: "admin",
          detail: `${game.homeTeam} ${home}x${away} ${game.awayTeam} · ${scored} palpites pontuados`,
        },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, scored });
  }

  if (b?.action === "status" && typeof b?.status === "string") {
    const allowed = ["SCHEDULED", "CLOSED", "FINISHED", "CANCELED"];
    if (!allowed.includes(b.status))
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    data.status = b.status;
  }

  if (b?.kickoffAt) {
    const k = new Date(String(b.kickoffAt));
    if (!Number.isNaN(k.getTime())) data.kickoffAt = k;
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nada a atualizar." }, { status: 400 });

  await prisma.game.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE: remove o jogo e os palpites dele
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;

  await prisma.prediction.deleteMany({ where: { gameId: id } });
  await prisma.game.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
