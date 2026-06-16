import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { hasSpecialistAccess } from "@/lib/specialist";
import { chatWithSpecialist, type ChatTurn } from "@/lib/ai";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const { gameId } = await params;

  // Bloqueio: só quem comprou o Especialista deste jogo pode conversar.
  if (!(await hasSpecialistAccess(uid, gameId))) {
    return NextResponse.json(
      { error: "Contrate o Especialista deste jogo para conversar.", locked: true },
      { status: 403 }
    );
  }

  maybeSweep();
  if (!rateLimit(`specchat:${uid}`, 30, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas mensagens em sequência. Aguarde um instante." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const raw = Array.isArray(body?.messages) ? body.messages : [];
    const messages: ChatTurn[] = raw
      .filter(
        (m: unknown): m is ChatTurn =>
          !!m &&
          typeof (m as ChatTurn).content === "string" &&
          ((m as ChatTurn).role === "user" || (m as ChatTurn).role === "assistant")
      )
      .map((m: ChatTurn) => ({ role: m.role, content: m.content.trim() }))
      .filter((m: ChatTurn) => m.content.length > 0);

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Envie uma mensagem." }, { status: 400 });
    }

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });

    const reply = await chatWithSpecialist({
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      competition: game.competition,
      stage: game.stage,
      kickoffAt: game.kickoffAt,
      notes: game.notes,
      messages,
    });

    return NextResponse.json({ reply });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao conversar com o Especialista.";
    console.error("[specialist chat] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
