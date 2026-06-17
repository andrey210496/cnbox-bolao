import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import GameCard, { type PredictionInfo } from "@/components/GameCard";
import LogoutButton from "@/components/LogoutButton";
import EntryButton from "@/components/EntryButton";
import { getCurrentUser } from "@/lib/session";
import { listGames, isOpen } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { getUnitSummaryForUser } from "@/lib/ranking";
import { formatBRL } from "@/lib/economics";

export const dynamic = "force-dynamic";
const MIN_ENTRY = 50;

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const firstName = user.fullName.split(" ")[0];

  const entry = await prisma.entry
    .findFirst({ where: { userId: user.id, status: "CONFIRMED" }, select: { id: true } })
    .catch(() => null);

  // ===== SEM ENTRADA: porta de entrada =====
  if (!entry) {
    const unit = user.unitId
      ? await prisma.unit
          .findUnique({ where: { id: user.unitId }, select: { entryFee: true } })
          .catch(() => null)
      : null;
    const fee = Math.max(MIN_ENTRY, unit?.entryFee ?? MIN_ENTRY);

    return (
      <main className="flex-1 w-full">
        <TopBar firstName={firstName} />
        <div className="mx-auto max-w-xl px-4 sm:px-8 py-10">
          <div className="card-premium glow-brand rounded-3xl p-7 text-center">
            <div className="text-4xl mb-3">🎟️</div>
            <h1 className="font-display text-3xl">
              ENTRE NO <span className="text-brand text-glow">BOLÃO</span>
            </h1>
            <p className="text-white/65 mt-3 text-sm">
              Pagamento <strong className="text-white">único</strong> de{" "}
              <strong className="text-brand">{formatBRL(fee)}</strong> da unidade{" "}
              <strong className="text-white/80">{user.unitName ?? "—"}</strong>. Depois você
              palpita em <strong className="text-white">todos os jogos</strong> da Copa, de
              graça, e disputa o ranking da sua unidade.
            </p>
            <ul className="text-left text-sm text-white/70 mt-5 space-y-1.5 mx-auto max-w-sm">
              <li>✅ Palpite em quantos jogos quiser</li>
              <li>✅ Ganhe pontos a cada acerto (placar exato vale mais)</li>
              <li>🏆 1º lugar da sua unidade leva o prêmio acumulado</li>
            </ul>
            <div className="mt-6">
              <EntryButton />
            </div>
            <Link href="/app/regras" className="mt-4 inline-block text-sm text-brand hover:text-brand-light">
              Ver regras e como pontuar →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ===== COM ENTRADA: bolão =====
  const [summary, games, preds] = await Promise.all([
    getUnitSummaryForUser(user.id, user.unitId),
    listGames().catch(() => []),
    prisma.prediction
      .findMany({ where: { userId: user.id }, select: { gameId: true, homeScore: true, awayScore: true, points: true, scoredAt: true } })
      .catch(() => []),
  ]);
  const predMap = new Map(
    preds.map((p) => [
      p.gameId,
      { homeScore: p.homeScore, awayScore: p.awayScore, points: p.points, scored: p.scoredAt !== null } as PredictionInfo,
    ])
  );

  const openGames = games.filter((g) => isOpen(g));
  const others = games.filter((g) => !isOpen(g));

  return (
    <main className="flex-1 w-full">
      <TopBar firstName={firstName} />
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8">
        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          <Stat label="Prêmio da unidade" value={formatBRL(summary.pool)} accent />
          <Stat label="Meus pontos" value={String(summary.myPoints)} accent />
          <Stat label="Minha posição" value={summary.myRank ? `${summary.myRank}º de ${summary.total}` : "—"} />
          <Link href="/app/ranking" className="card-premium rounded-2xl p-4 flex flex-col justify-center hover:border-brand/40 border border-transparent transition">
            <span className="text-xs text-white/50">Ranking da unidade</span>
            <span className="font-display text-xl text-brand mt-1">Ver classificação →</span>
          </Link>
        </div>

        <p className="text-white/55 text-sm mb-7">
          Unidade <strong className="text-white/80">{user.unitName ?? "—"}</strong>. Palpite em
          todos os jogos — você concorre só com a sua unidade.{" "}
          <Link href="/app/regras" className="text-brand hover:text-brand-light">Regras →</Link>
        </p>

        {openGames.length > 0 && (
          <>
            <h2 className="font-display text-2xl mb-4">JOGOS <span className="text-brand">ABERTOS</span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {openGames.map((g) => (
                <GameCard key={g.id} game={g} href={`/app/jogo/${g.id}`} cta="Palpitar" prediction={predMap.get(g.id) ?? null} />
              ))}
            </div>
          </>
        )}

        {others.length > 0 && (
          <>
            <h2 className="font-display text-2xl mb-4">ENCERRADOS / <span className="text-brand">FECHADOS</span></h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {others.map((g) => (
                <GameCard key={g.id} game={g} href={`/app/jogo/${g.id}`} cta="Ver" prediction={predMap.get(g.id) ?? null} />
              ))}
            </div>
          </>
        )}

        {games.length === 0 && (
          <div className="card-premium rounded-3xl p-10 text-center">
            <p className="text-white/60">Os jogos da Copa aparecem aqui assim que forem liberados. ⚽</p>
          </div>
        )}
      </div>
    </main>
  );
}

function TopBar({ firstName }: { firstName: string }) {
  return (
    <div className="w-full glass border-b border-white/10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/"><Logo height={30} /></Link>
        <div className="flex items-center gap-3">
          <Link href="/app/ranking" className="hidden sm:inline text-sm text-white/60 hover:text-white">Ranking</Link>
          <Link href="/app/regras" className="hidden sm:inline text-sm text-white/60 hover:text-white">Regras</Link>
          <span className="hidden sm:inline text-sm text-white/60">Olá, <strong className="text-white">{firstName}</strong></span>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card-premium rounded-2xl p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`font-display text-2xl mt-1 tabular-nums ${accent ? "text-brand text-glow" : "text-white"}`}>{value}</p>
    </div>
  );
}
