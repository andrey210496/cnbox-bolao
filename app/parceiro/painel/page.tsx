import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import CopyLinkBox from "@/components/CopyLinkBox";
import { getHolderUnitId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/economics";
import { getUnitsRanking } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function HolderPanelPage() {
  const unitId = await getHolderUnitId();
  if (!unitId) redirect("/parceiro/entrar");

  // Sempre escopado ao unitId da SESSÃO — holder nunca vê dados de outra unidade.
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { name: true, slug: true, holderName: true, pixKey: true, active: true },
  });
  if (!unit) redirect("/parceiro/entrar");

  const [confirmed, pending, students, winners] = await Promise.all([
    prisma.bet.aggregate({
      where: { unitId, status: "CONFIRMED" },
      _sum: { unitCommission: true, amount: true },
      _count: { _all: true },
    }),
    prisma.bet.count({ where: { unitId, status: "PENDING" } }),
    prisma.user.count({ where: { unitId } }),
    // ganhadores da unidade (palpites premiados após apuração)
    prisma.payout.count({ where: { bet: { unitId } } }).catch(() => 0),
  ]);

  const commission = confirmed._sum.unitCommission ?? 0;
  const palpites = confirmed._count._all;

  // Ranking de unidades (sem valores em R$) — motiva a competição
  const ranking = await getUnitsRanking();
  const myPos = ranking.findIndex((r) => r.id === unitId);
  const myRank = myPos >= 0 ? myPos + 1 : null;
  // mostra o top 10; se a unidade estiver fora, anexa a linha dela
  const top = ranking.slice(0, 10).map((r, i) => ({ ...r, pos: i + 1 }));
  const showOwnExtra = myPos >= 10;
  const aheadGap =
    myPos > 0 ? ranking[myPos - 1].bets - ranking[myPos].bets : 0; // palpites p/ alcançar o de cima

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const link = `${base}/u/${unit.slug}`;

  const firstName = (unit.holderName ?? "Responsável").split(" ")[0];

  const stats = [
    { label: "Comissão acumulada", value: formatBRL(commission), accent: true },
    { label: "Palpites confirmados", value: String(palpites) },
    { label: "Alunos cadastrados", value: String(students) },
    { label: "Ganhadores da unidade", value: `🏆 ${winners}` },
  ];

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo height={30} />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-white/60">
              Olá, <strong className="text-white">{firstName}</strong>
            </span>
            <LogoutButton endpoint="/api/units/logout" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl sm:text-4xl mb-1">
          UNIDADE <span className="text-brand text-glow">{unit.name}</span>
        </h1>
        <p className="text-white/55 text-sm mb-7">
          {unit.active
            ? "Sua unidade está ativa. Divulgue seu link e acompanhe os resultados."
            : "Sua unidade está inativa no momento. Fale com a CNBOX."}
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="card-premium rounded-2xl p-5">
              <p className="text-xs text-white/50">{s.label}</p>
              <p
                className={`font-display text-2xl mt-1 tabular-nums ${
                  s.accent ? "text-brand text-glow" : "text-white"
                }`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <section className="card-premium rounded-3xl p-6">
            <h2 className="font-display text-xl mb-3">
              SEU <span className="text-brand">LINK</span>
            </h2>
            <p className="text-white/55 text-sm mb-4">
              Todo aluno que se cadastrar e palpitar por este link conta como indicação
              da sua unidade e gera comissão pra você.
            </p>
            <CopyLinkBox link={link} />
          </section>

          <section className="card-premium rounded-3xl p-6">
            <h2 className="font-display text-xl mb-3">
              COMO FUNCIONA O <span className="text-brand">PAGAMENTO</span>
            </h2>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li>• A comissão é calculada sobre cada palpite confirmado pelo seu link.</li>
              <li>
                • O repasse é feito na sua chave PIX cadastrada
                {unit.pixKey ? ` (${maskPix(unit.pixKey)})` : ""}.
              </li>
              <li>• O pagamento acontece após a apuração de cada jogo (em até 24h).</li>
              {pending > 0 && (
                <li className="text-amber-300">
                  • Você tem {pending} palpite(s) aguardando pagamento — ainda não contam
                  na comissão.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Ranking de unidades — sem valores, só posições */}
        <section className="card-premium rounded-3xl p-6 mt-5">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-1">
            <h2 className="font-display text-xl">
              RANKING DE <span className="text-brand">UNIDADES</span>
            </h2>
            {myRank && (
              <span className="text-sm text-white/60">
                Sua posição:{" "}
                <strong className="text-brand">{myRank}º</strong> de {ranking.length}
              </span>
            )}
          </div>
          <p className="text-white/50 text-sm mb-4">
            Quanto mais palpites entrarem pelo seu link, mais alto você fica. Bora ultrapassar
            as outras unidades! 🚀
            {myPos > 0 && aheadGap > 0 && (
              <>
                {" "}Faltam <strong className="text-white">{aheadGap}</strong> palpite(s) pra
                alcançar a unidade acima.
              </>
            )}
          </p>

          <div className="space-y-2">
            {top.map((r) => {
              const mine = r.id === unitId;
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border ${
                    mine
                      ? "bg-brand/15 border-brand/40"
                      : "bg-ink/40 border-white/5"
                  }`}
                >
                  <span className={`font-display w-8 text-center ${r.pos <= 3 ? "text-brand text-lg" : "text-white/50"}`}>
                    {["🥇", "🥈", "🥉"][r.pos - 1] ?? r.pos}
                  </span>
                  <span className={`flex-1 truncate ${mine ? "text-white font-semibold" : "text-white/75"}`}>
                    {r.name} {mine && <span className="text-brand text-xs">(você)</span>}
                  </span>
                  <span className="text-sm tabular-nums text-white/50">
                    {r.bets} palpite{r.bets === 1 ? "" : "s"}
                  </span>
                </div>
              );
            })}

            {showOwnExtra && myRank && (
              <>
                <p className="text-center text-white/30 text-xs">···</p>
                <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 border bg-brand/15 border-brand/40">
                  <span className="font-display w-8 text-center text-white/70">{myRank}</span>
                  <span className="flex-1 truncate text-white font-semibold">
                    {unit.name} <span className="text-brand text-xs">(você)</span>
                  </span>
                  <span className="text-sm tabular-nums text-white/50">
                    {ranking[myPos].bets} palpite{ranking[myPos].bets === 1 ? "" : "s"}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-white/35">
          Dúvidas sobre comissões? Fale com a CNBOX.
        </p>
      </div>
    </main>
  );
}

function maskPix(key: string): string {
  if (key.includes("@")) {
    const [u, d] = key.split("@");
    return `${u.slice(0, 2)}***@${d}`;
  }
  if (key.length <= 4) return "****";
  return `${key.slice(0, 3)}***${key.slice(-2)}`;
}
