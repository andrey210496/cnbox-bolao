import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PredictionsTable, { type PredRow, type GameOpt } from "@/components/admin/PredictionsTable";

export const dynamic = "force-dynamic";

export default async function PalpitesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin");
  const sp = await searchParams;
  const gameId = sp?.game ?? "";

  const where = gameId ? { gameId } : {};

  const [rows, games, total] = await Promise.all([
    prisma.prediction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        user: { select: { fullName: true, unit: { select: { name: true } } } },
        game: { select: { homeTeam: true, awayTeam: true } },
      },
    }),
    prisma.game.findMany({ orderBy: { kickoffAt: "asc" }, select: { id: true, homeTeam: true, awayTeam: true } }),
    prisma.prediction.count(),
  ]);

  const preds: PredRow[] = rows.map((p) => ({
    id: p.id,
    userName: p.user?.fullName ?? "—",
    unitName: p.user?.unit?.name ?? null,
    homeTeam: p.game.homeTeam,
    awayTeam: p.game.awayTeam,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    points: p.points,
    scored: p.scoredAt !== null,
    createdAt: p.createdAt.toISOString(),
  }));

  const gameOpts: GameOpt[] = games.map((g) => ({ id: g.id, label: `${g.homeTeam} x ${g.awayTeam}` }));

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl">PAL<span className="text-brand">PITES</span></h1>
          <p className="text-white/50 text-sm mt-1">
            Todos os palpites dos alunos ({total} no total). Filtre por jogo ou busque por aluno/unidade.
          </p>
        </div>
        <section className="card-premium rounded-3xl p-5 sm:p-6">
          <PredictionsTable preds={preds} games={gameOpts} gameId={gameId} />
        </section>
        <p className="text-center text-xs text-white/30">Mostrando até 500 palpites do filtro selecionado.</p>
      </div>
    </div>
  );
}
