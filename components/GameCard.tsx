import Link from "next/link";
import Flag from "./Flag";
import { formatBRL } from "@/lib/economics";
import { formatGameDate, isOpen, type GameWithPool } from "@/lib/games";

export default function GameCard({
  game,
  href,
  cta,
}: {
  game: GameWithPool;
  href: string;
  cta: string;
}) {
  const open = isOpen(game);
  const finished = game.status === "FINISHED";
  const score =
    finished && game.finalHome !== null && game.finalAway !== null
      ? `${game.finalHome} - ${game.finalAway}`
      : "? - ?";

  return (
    <div className="card-premium rounded-3xl p-5 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 truncate">
          {game.stage ? `${game.competition} · ${game.stage}` : game.competition}
        </span>
        <StatusPill status={game.status} open={open} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Team code={game.homeCode} name={game.homeTeam} />
        <div className="flex flex-col items-center shrink-0 px-1">
          <span className="font-display text-2xl sm:text-3xl text-brand-light tabular-nums">
            {score}
          </span>
        </div>
        <Team code={game.awayCode} name={game.awayTeam} />
      </div>

      <p className="text-center text-xs text-white/45 mt-3 capitalize">
        {formatGameDate(game.kickoffAt)}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-ink/50 border border-white/5 px-3 py-2 text-center">
          <p className="font-display text-lg text-brand text-glow tabular-nums">
            {formatBRL(game.pool)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/40">prêmio</p>
        </div>
        <div className="rounded-xl bg-ink/50 border border-white/5 px-3 py-2 text-center">
          <p className="font-display text-lg text-white tabular-nums">{game.bets}</p>
          <p className="text-[10px] uppercase tracking-wider text-white/40">palpites</p>
        </div>
      </div>

      {open && (
        <Link
          href={`${href}#especialista`}
          className="group mt-4 flex items-start gap-2.5 rounded-xl border border-brand/30 bg-gradient-to-r from-brand/15 to-brand/5 px-3 py-2.5 hover:border-brand/60 hover:from-brand/25 transition"
        >
          <span className="text-lg leading-none mt-0.5">🤖</span>
          <p className="text-[11px] leading-snug text-white/75">
            <span className="font-bold text-brand">Mais precisão no palpite:</span> peça uma{" "}
            <span className="font-semibold text-white">dica do Especialista IA</span> antes de
            apostar.{" "}
            <span className="text-brand font-semibold whitespace-nowrap group-hover:underline">
              Ver dica →
            </span>
          </p>
        </Link>
      )}

      <Link
        href={href}
        className={`mt-4 block text-center py-3 rounded-xl font-semibold transition ${
          open
            ? "btn-primary"
            : "bg-white/10 text-white/40 pointer-events-none cursor-not-allowed"
        }`}
      >
        {open ? cta : finished ? "Encerrado" : "Palpites fechados"}
      </Link>
    </div>
  );
}

function Team({ code, name }: { code: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <Flag code={code} name={name} className="w-14 h-9 sm:w-16 sm:h-11" />
      <span className="font-display text-sm sm:text-base tracking-wide text-center truncate w-full">
        {name}
      </span>
    </div>
  );
}

function StatusPill({ status, open }: { status: string; open: boolean }) {
  if (open)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand/12 border border-brand/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand">
        Aberto
      </span>
    );
  if (status === "FINISHED")
    return (
      <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
        Final
      </span>
    );
  return (
    <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
      Fechado
    </span>
  );
}
