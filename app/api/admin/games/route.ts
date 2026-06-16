import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { teamName } from "@/lib/teams";

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const homeCode = String(b?.homeCode ?? "").trim();
  const awayCode = String(b?.awayCode ?? "").trim();
  const kickoff = String(b?.kickoffAt ?? "");
  const stage = String(b?.stage ?? "").trim() || null;
  const competition = String(b?.competition ?? "Copa do Mundo FIFA 2026").trim();

  if (!homeCode || !awayCode || homeCode === awayCode) {
    return NextResponse.json(
      { error: "Selecione duas seleções diferentes." },
      { status: 400 }
    );
  }
  const kickoffAt = new Date(kickoff);
  if (Number.isNaN(kickoffAt.getTime())) {
    return NextResponse.json({ error: "Data/hora inválida." }, { status: 400 });
  }

  const game = await prisma.game.create({
    data: {
      homeTeam: teamName(homeCode),
      homeCode,
      awayTeam: teamName(awayCode),
      awayCode,
      kickoffAt,
      stage,
      competition,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: game.id });
}
