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
    let updated = 0;
    let duplicates = 0;
    for (const m of matches) {
      // Mesma partida = mesmo confronto (cada par joga uma vez na fase atual).
      const exists = await prisma.game.findFirst({
        where: { homeCode: m.homeCode, awayCode: m.awayCode },
        select: { id: true, status: true, kickoffAt: true },
      });

      if (exists) {
        // Só corrige jogos ainda agendados (não mexe nos já encerrados/cancelados).
        if (exists.status === "SCHEDULED") {
          const changed = exists.kickoffAt.getTime() !== m.kickoffAt.getTime();
          await prisma.game.update({
            where: { id: exists.id },
            data: { kickoffAt: m.kickoffAt, stage: m.stage },
          });
          if (changed) updated++;
          else duplicates++;
        } else {
          duplicates++;
        }
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
          detail: `criados ${created}, atualizados ${updated}, duplicados ${duplicates}, ignorados ${skipped}`,
        },
      })
      .catch(() => {});

    return NextResponse.json({ ok: true, created, updated, duplicates, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao importar.";
    console.error("[games import] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
