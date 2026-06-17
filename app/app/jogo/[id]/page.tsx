import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import PredictionForm from "@/components/PredictionForm";
import SpecialistPanel from "@/components/SpecialistPanel";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomics } from "@/lib/economics";
import { formatGameDate, isOpen } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function JogoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const uid = await getUserId();
  if (!uid) redirect("/entrar");
  const { id } = await params;

  // Precisa ter entrado no bolão
  const entry = await prisma.entry.findFirst({
    where: { userId: uid, status: "CONFIRMED" },
    select: { id: true },
  });
  if (!entry) redirect("/app");

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();

  const [eco, pred] = await Promise.all([
    getEconomics(),
    prisma.prediction.findUnique({
      where: { userId_gameId: { userId: uid, gameId: id } },
      select: { homeScore: true, awayScore: true, points: true, scoredAt: true },
    }),
  ]);

  const open = isOpen(game);
  const finished = game.status === "FINISHED" && game.finalHome !== null;

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/app"><Logo height={30} /></Link>
          <Link href="/app" className="text-sm text-white/60 hover:text-white">← Voltar</Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-10">
        <div className="text-center mb-7">
          <span className="text-xs uppercase tracking-[0.3em] text-brand">
            {game.stage ? `${game.competition} · ${game.stage}` : game.competition}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">
            {game.homeTeam} <span className="text-white/30">x</span> {game.awayTeam}
          </h1>
          <p className="text-white/50 text-sm mt-2 capitalize">{formatGameDate(game.kickoffAt)}</p>
        </div>

        {/* Resultado + pontos (se apurado) */}
        {finished && (
          <div className="card-premium rounded-2xl p-4 mb-5 text-center">
            <p className="text-sm text-white/60">
              Resultado: <strong className="text-white">{game.finalHome} - {game.finalAway}</strong>
            </p>
            {pred && pred.scoredAt && (
              <p className="text-sm mt-1">
                Seu palpite {pred.homeScore}-{pred.awayScore} ·{" "}
                <strong className="text-brand">+{pred.points} ponto(s)</strong>
              </p>
            )}
            {!pred && <p className="text-xs text-white/40 mt-1">Você não palpitou neste jogo.</p>}
          </div>
        )}

        {open && (
          <a
            href="#especialista"
            className="group mb-5 flex items-center gap-3 rounded-2xl border border-brand/30 bg-gradient-to-r from-brand/15 to-brand/5 px-4 py-3.5 hover:border-brand/60 transition"
          >
            <span className="text-2xl shrink-0">🤖</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Mais precisão no palpite com o Especialista IA</p>
              <p className="text-[12px] text-white/55">Peça uma dica da IA: análise do jogo e os placares mais prováveis.</p>
            </div>
            <span className="shrink-0 text-sm font-bold text-brand group-hover:underline whitespace-nowrap">Ver dica →</span>
          </a>
        )}

        <PredictionForm
          gameId={game.id}
          home={{ code: game.homeCode, name: game.homeTeam }}
          away={{ code: game.awayCode, name: game.awayTeam }}
          initial={pred ? { homeScore: pred.homeScore, awayScore: pred.awayScore } : null}
          locked={!open}
        />

        {open && (
          <div id="especialista" className="scroll-mt-24">
            <SpecialistPanel gameId={game.id} price={eco.specialist_price} />
          </div>
        )}
      </div>
    </main>
  );
}
