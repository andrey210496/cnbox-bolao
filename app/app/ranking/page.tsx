import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import { getCurrentUser } from "@/lib/session";
import { getUnitStandings, getUnitPool } from "@/lib/ranking";
import { formatBRL } from "@/lib/economics";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const [standings, pool] = await Promise.all([
    getUnitStandings(user.unitId),
    getUnitPool(user.unitId),
  ]);

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/app"><Logo height={30} /></Link>
          <Link href="/app" className="text-sm text-white/60 hover:text-white">← Voltar</Link>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl">
          RANKING · <span className="text-brand text-glow">{user.unitName ?? "Sua unidade"}</span>
        </h1>
        <p className="text-white/55 text-sm mt-1 mb-6">
          Prêmio acumulado da unidade:{" "}
          <strong className="text-brand">{formatBRL(pool)}</strong> · o 1º lugar leva no fim da
          Copa (empate divide).
        </p>

        {standings.length === 0 ? (
          <div className="card-premium rounded-3xl p-10 text-center text-white/50">
            Ninguém entrou no bolão da unidade ainda. Seja o primeiro! ⚽
          </div>
        ) : (
          <section className="card-premium rounded-3xl p-4 sm:p-6">
            <div className="space-y-2">
              {standings.map((s) => {
                const mine = s.userId === user.id;
                return (
                  <div
                    key={s.userId}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                      mine ? "bg-brand/15 border-brand/40" : "bg-ink/40 border-white/5"
                    }`}
                  >
                    <span className={`font-display w-8 text-center ${s.rank <= 3 ? "text-brand text-lg" : "text-white/50"}`}>
                      {["🥇", "🥈", "🥉"][s.rank - 1] ?? s.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${mine ? "text-white font-semibold" : "text-white/80"}`}>
                        {s.name} {mine && <span className="text-brand text-xs">(você)</span>}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {s.predictions} palpite(s) · {s.exact} placar(es) exato(s)
                      </p>
                    </div>
                    <span className="font-display text-xl text-brand tabular-nums">{s.points}<span className="text-xs text-white/40 ml-1">pts</span></span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs text-white/30">
          Desempate: mais placares exatos, depois quem entrou primeiro.{" "}
          <Link href="/app/regras" className="text-brand">Ver regras →</Link>
        </p>
      </div>
    </main>
  );
}
