import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { fetchWorldCupMatches } from "@/lib/import-games";

// Importa os PLACARES finais da fonte (openfootball) e marca os jogos como FINISHED.
// Não dispara pagamento — o admin ainda revisa e aprova a apuração.
export async function POST() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { matches } = await fetchWorldCupMatches();
    const withScore = matches.filter(
      (m) => m.finalHome !== null && m.finalAway !== null
    );
    if (withScore.length === 0) {
      return NextResponse.json({
        error: "Nenhum jogo com placar disponível na fonte ainda.",
      }, { status: 400 });
    }

    let updated = 0;
    let alreadyDone = 0;
    let notFound = 0;

    for (const m of withScore) {
      // só atualiza jogos nossos que ainda NÃO foram apurados/pagos
      const game = await prisma.game.findFirst({
        where: { homeCode: m.homeCode, awayCode: m.awayCode },
        select: { id: true, status: true, payoutStatus: true },
      });
      if (!game) {
        notFound++;
        continue;
      }
      if (game.status === "FINISHED" || game.payoutStatus !== "NONE") {
        alreadyDone++;
        continue;
      }
      await prisma.game.update({
        where: { id: game.id },
        data: {
          finalHome: m.finalHome,
          finalAway: m.finalAway,
          status: "FINISHED",
          finishedAt: new Date(),
        },
      });
      updated++;
    }

    await prisma.auditLog
      .create({
        data: {
          action: "results_import",
          actor: "admin",
          detail: `atualizados ${updated}, já apurados ${alreadyDone}, não encontrados ${notFound}`,
        },
      })
      .catch(() => {});

    return NextResponse.json({ ok: true, updated, alreadyDone, notFound });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao importar resultados.";
    console.error("[results import] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
