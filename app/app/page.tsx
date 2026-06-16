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

  const games = await listGamesWithPools().catch(() => []);
  const open = games.filter(
    (g) => g.status === "SCHEDULED" && Date.now() < new Date(g.kickoffAt).getTime()
  );

  const bets = await prisma.bet
    .findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { game: { select: { homeTeam: true, awayTeam: true } } },
    })
    .catch(() => []);

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
          Você está na unidade{" "}
          <strong className="text-white/80">{user.unitName ?? "—"}</strong>.
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
                return (
                  <div
                    key={b.id}
                    className="card-premium rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate">
                        {b.game.homeTeam} x {b.game.awayTeam}
                      </p>
                      <p className={`text-xs ${s.c}`}>{s.t}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-xl text-brand-light tabular-nums">
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
