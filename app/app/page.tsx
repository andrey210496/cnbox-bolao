import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import GameCard from "@/components/GameCard";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/session";
import { listGamesWithPools } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/economics";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { t: string; c: string }> = {
  CONFIRMED: { t: "Confirmado", c: "text-brand-light" },
  PENDING: { t: "Aguardando PIX", c: "text-amber-300" },
  EXPIRED: { t: "Expirado", c: "text-white/40" },
  FAILED: { t: "Falhou", c: "text-red-300" },
  REFUNDED: { t: "Estornado", c: "text-white/40" },
};

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  // Bolão por unidade: prêmios/contagens consideram só a unidade do aluno
  const games = await listGamesWithPools({ unitId: user.unitId }).catch(() => []);
  const open = games.filter(
    (g) => g.status === "SCHEDULED" && Date.now() < new Date(g.kickoffAt).getTime()
  );

  const bets = await prisma.bet
    .findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        game: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            status: true,
            finalHome: true,
            finalAway: true,
          },
        },
      },
    })
    .catch(() => []);

  // Prêmio acumulado e nº de palpites por jogo (dos jogos que o aluno palpitou)
  const gameIds = [...new Set(bets.map((b) => b.gameId))];
  const pools = gameIds.length
    ? await prisma.bet
        .groupBy({
          by: ["gameId"],
          // só a unidade do aluno (bolão por unidade)
          where: { gameId: { in: gameIds }, status: "CONFIRMED", unitId: user.unitId },
          _sum: { prizeContribution: true },
          _count: { _all: true },
        })
        .catch(() => [])
    : [];
  const poolMap = new Map(
    pools.map((p) => [p.gameId, { pool: p._sum.prizeContribution ?? 0, count: p._count._all }])
  );

  // Nº de ganhadores (placar exato) dos jogos já apurados
  const finishedGames = [
    ...new Map(
      bets
        .map((b) => b.game)
        .filter((g) => g.status === "FINISHED" && g.finalHome !== null && g.finalAway !== null)
        .map((g) => [g.id, g])
    ).values(),
  ];
  const winnersMap = new Map<string, number>();
  for (const g of finishedGames) {
    const c = await prisma.bet
      .count({
        where: {
          gameId: g.id,
          status: "CONFIRMED",
          unitId: user.unitId, // ganhadores só da unidade do aluno
          homeScore: g.finalHome!,
          awayScore: g.finalAway!,
        },
      })
      .catch(() => 0);
    winnersMap.set(g.id, c);
  }

  // Prêmios do próprio aluno (status do pagamento)
  const myPayouts = bets.length
    ? await prisma.payout
        .findMany({ where: { betId: { in: bets.map((b) => b.id) } } })
        .catch(() => [])
    : [];
  const payoutMap = new Map(myPayouts.map((p) => [p.betId, p]));

  const PAYOUT_STATUS: Record<string, string> = {
    PENDING: "prêmio em processamento (até 24h)",
    APPROVED: "prêmio em processamento (até 24h)",
    PROCESSING: "prêmio em processamento (até 24h)",
    SENT: "prêmio pago no seu PIX ✅",
    FAILED: "falha no envio — vamos reenviar",
  };

  const firstName = user.fullName.split(" ")[0];

  return (
    <main className="flex-1 w-full">
      {/* Topo */}
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo height={30} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-white/60">
              Olá, <strong className="text-white">{firstName}</strong>
            </span>
            <LogoutButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl sm:text-4xl mb-1">
          ESCOLHA UM JOGO E <span className="text-brand text-glow">PALPITE</span>
        </h1>
        <p className="text-white/55 text-sm mb-7">
          Você concorre no bolão da unidade{" "}
          <strong className="text-white/80">{user.unitName ?? "—"}</strong> — o prêmio é
          dividido entre os ganhadores da sua unidade.
        </p>

        {/* Jogos abertos */}
        {open.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {open.map((g) => (
              <GameCard key={g.id} game={g} href={`/app/jogo/${g.id}`} cta="Palpitar" />
            ))}
          </div>
        ) : (
          <div className="card-premium rounded-3xl p-10 text-center">
            <p className="text-white/60">
              Nenhum jogo aberto agora. Os jogos da Copa aparecem aqui assim que
              forem liberados. ⚽
            </p>
          </div>
        )}

        {/* Meus palpites */}
        {bets.length > 0 && (
          <div className="mt-10">
            <h2 className="font-display text-2xl mb-4">
              MEUS <span className="text-brand">PALPITES</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bets.map((b) => {
                const s = STATUS[b.status] ?? STATUS.PENDING;
                const pm = poolMap.get(b.gameId);
                const pool = pm?.pool ?? 0;
                const palpites = pm?.count ?? 0;
                const g = b.game;
                const apurado =
                  g.status === "FINISHED" && g.finalHome !== null && g.finalAway !== null;
                const won =
                  apurado &&
                  b.status === "CONFIRMED" &&
                  b.homeScore === g.finalHome &&
                  b.awayScore === g.finalAway;
                const winners = winnersMap.get(b.gameId) ?? 0;
                const payout = payoutMap.get(b.id);
                const prize = payout?.amount ?? (winners > 0 ? pool / winners : 0);

                return (
                  <div key={b.id} className="card-premium rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white/80 truncate">
                          {g.homeTeam} x {g.awayTeam}
                        </p>
                        <p className={`text-xs ${s.c}`}>{s.t}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] uppercase tracking-wider text-white/40">seu palpite</p>
                        <p className="font-display text-xl text-brand-light tabular-nums leading-tight">
                          {b.homeScore}-{b.awayScore}
                        </p>
                        {b.status === "PENDING" && (
                          <Link
                            href={`/pagamento/${b.id}`}
                            className="text-[11px] text-brand hover:text-brand-light"
                          >
                            pagar →
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Prêmio acumulado do jogo */}
                    <div className="flex items-center justify-between text-xs rounded-lg bg-ink/40 border border-white/5 px-2.5 py-1.5">
                      <span className="text-white/45">Prêmio acumulado</span>
                      <span className="text-brand font-semibold tabular-nums">
                        {formatBRL(pool)}{" "}
                        <span className="text-white/35 font-normal">· {palpites} palpite{palpites === 1 ? "" : "s"}</span>
                      </span>
                    </div>

                    {/* Resultado / ganhou */}
                    {apurado ? (
                      won ? (
                        <div className="rounded-lg bg-brand/15 border border-brand/40 px-2.5 py-2">
                          <p className="text-sm font-bold text-brand">🏆 Você acertou!</p>
                          <p className="text-xs text-white/70">
                            Resultado {g.finalHome}-{g.finalAway} · prêmio de{" "}
                            <strong className="text-brand-light">{formatBRL(prize)}</strong>{" "}
                            dividido entre {winners} ganhador{winners === 1 ? "" : "es"}.
                          </p>
                          {payout && (
                            <p className="text-[11px] text-white/50 mt-0.5">
                              {PAYOUT_STATUS[payout.status] ?? "prêmio em processamento"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-2">
                          <p className="text-xs text-white/60">
                            Resultado <strong className="text-white/80">{g.finalHome}-{g.finalAway}</strong>.{" "}
                            {winners > 0
                              ? `${winners} ganhador${winners === 1 ? "" : "es"} acertaram.`
                              : "Ninguém acertou o placar exato."}{" "}
                            Não foi dessa vez. 🤝
                          </p>
                        </div>
                      )
                    ) : (
                      b.status === "CONFIRMED" && (
                        <p className="text-[11px] text-white/40">
                          Resultado e ganhadores após o fim do jogo.
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-white/35">
          Apuração e pagamento dos prêmios em até 24h após o fim de cada jogo.
        </p>
      </div>
    </main>
  );
}
