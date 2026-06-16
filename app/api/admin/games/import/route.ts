import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { fetchWorldCupMatches } from "@/lib/import-games";

export async function POST() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { matches, skipped } = await fetchWorldCupMatches();
    if (matches.length === 0) {
      return NextResponse.json({
        error: "Nenhum jogo com seleções definidas encontrado na fonte ainda.",
      }, { status: 400 });
    }

    let created = 0;
    let duplicates = 0;
    for (const m of matches) {
      const dayStart = new Date(m.kickoffAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(m.kickoffAt);
      dayEnd.setHours(23, 59, 59, 999);

      const exists = await prisma.game.findFirst({
        where: {
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          kickoffAt: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      });
      if (exists) {
        duplicates++;
        continue;
      }
      await prisma.game.create({
        data: {
          homeTeam: m.homeTeam,
          homeCode: m.homeCode,
          awayTeam: m.awayTeam,
          awayCode: m.awayCode,
          competition: "Copa do Mundo FIFA 2026",
          stage: m.stage,
          kickoffAt: m.kickoffAt,
        },
      });
      created++;
    }

    await prisma.auditLog
      .create({
        data: {
          action: "games_import",
          actor: "admin",
          detail: `criados ${created}, duplicados ${duplicates}, ignorados ${skipped}`,
        },
      })
      .catch(() => {});

    return NextResponse.json({ ok: true, created, duplicates, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao importar.";
    console.error("[games import] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
