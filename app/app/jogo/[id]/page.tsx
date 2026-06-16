import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import BetForm from "@/components/BetForm";
import SpecialistPanel from "@/components/SpecialistPanel";
import { getUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomics, formatBRL } from "@/lib/economics";
import { formatGameDate, isOpen } from "@/lib/games";

export const dynamic = "force-dynamic";

export default async function JogoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await getUserId())) redirect("/entrar");
  const { id } = await params;

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game) notFound();

  const eco = await getEconomics();
  const open = isOpen(game);

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/app">
            <Logo height={30} />
          </Link>
          <Link href="/app" className="text-sm text-white/60 hover:text-white">
            ← Voltar
          </Link>
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
          <p className="text-white/50 text-sm mt-2 capitalize">
            {formatGameDate(game.kickoffAt)}
          </p>
        </div>

        {open ? (
          <BetForm
            gameId={game.id}
            home={{ code: game.homeCode, name: game.homeTeam }}
            away={{ code: game.awayCode, name: game.awayTeam }}
            price={eco.bet_price}
          />
        ) : (
          <div className="card-premium rounded-3xl p-10 text-center">
            <p className="text-white/60">
              Os palpites deste jogo estão{" "}
              {game.status === "FINISHED" ? "encerrados" : "fechados"}.
            </p>
            <Link
              href="/app"
              className="mt-4 inline-block text-brand hover:text-brand-light"
            >
              Ver outros jogos →
            </Link>
          </div>
        )}

        {/* Especialista IA (produto pago, opcional) */}
        {open && (
          <div id="especialista" className="scroll-mt-24">
            <SpecialistPanel gameId={game.id} price={eco.specialist_price} />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/35">
          Cada palpite custa {formatBRL(eco.bet_price)}. Apuração e pagamento em até{" "}
          {eco.payout_deadline_hours}h após o jogo.
        </p>
      </div>
    </main>
  );
}
