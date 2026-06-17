import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import CopyLinkBox from "@/components/CopyLinkBox";
import EntryFeeEditor from "@/components/EntryFeeEditor";
import { getHolderUnitId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/economics";
import { getUnitPool, getUnitStandings } from "@/lib/ranking";

export const dynamic = "force-dynamic";
const MIN_ENTRY = 50;

export default async function HolderPanelPage() {
  const unitId = await getHolderUnitId();
  if (!unitId) redirect("/parceiro/entrar");

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { name: true, slug: true, holderName: true, pixKey: true, active: true, entryFee: true },
  });
  if (!unit) redirect("/parceiro/entrar");

  const [pool, standings, pendingCount] = await Promise.all([
    getUnitPool(unitId),
    getUnitStandings(unitId),
    prisma.entry.count({ where: { unitId, status: "PENDING" } }),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const link = `${base}/u/${unit.slug}`;
  const firstName = (unit.holderName ?? "Responsável").split(" ")[0];
  const fee = Math.max(MIN_ENTRY, unit.entryFee ?? MIN_ENTRY);
  const leader = standings[0];

  const stats = [
    { label: "Prêmio acumulado", value: formatBRL(pool), accent: true },
    { label: "Participantes", value: String(standings.length) },
    { label: "Aguardando pgto", value: String(pendingCount) },
    { label: "Líder atual", value: leader ? `${leader.points} pts` : "—" },
  ];

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo height={30} /></Link>
          <div className="flex items-center gap-3">
            <Link href="/parceiro/regras" className="hidden sm:inline text-sm text-white/60 hover:text-white">Regras</Link>
            <span className="hidden sm:inline text-sm text-white/60">Olá, <strong className="text-white">{firstName}</strong></span>
            <LogoutButton endpoint="/api/units/logout" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl sm:text-4xl mb-1">
          UNIDADE <span className="text-brand text-glow">{unit.name}</span>
        </h1>
        <p className="text-white/55 text-sm mb-7">
          {unit.active ? "Divulgue seu link e acompanhe o ranking dos seus alunos." : "Sua unidade está inativa. Fale com a CNBOX."}{" "}
          <Link href="/parceiro/regras" className="text-brand hover:text-brand-light">Ver regras →</Link>
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="card-premium rounded-2xl p-5">
              <p className="text-xs text-white/50">{s.label}</p>
              <p className={`font-display text-2xl mt-1 tabular-nums ${s.accent ? "text-brand text-glow" : "text-white"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <section className="card-premium rounded-3xl p-6">
            <h2 className="font-display text-xl mb-3">SEU <span className="text-brand">LINK</span></h2>
            <p className="text-white/55 text-sm mb-4">Todo aluno que entrar pelo seu link conta pra sua unidade e gera comissão.</p>
            <CopyLinkBox link={link} />
          </section>

          <section className="card-premium rounded-3xl p-6">
            <h2 className="font-display text-xl mb-3">VALOR DA <span className="text-brand">ENTRADA</span></h2>
            <p className="text-white/55 text-sm mb-4">
              Quanto cada aluno paga (uma vez) pra entrar no bolão da sua unidade. Mínimo {formatBRL(MIN_ENTRY)}.
            </p>
            <EntryFeeEditor value={fee} />
          </section>
        </div>

        {/* Ranking dos alunos */}
        <section className="card-premium rounded-3xl p-5 sm:p-6">
          <h2 className="font-display text-2xl mb-4">RANKING DA <span className="text-brand">UNIDADE</span></h2>
          {standings.length === 0 ? (
            <p className="text-white/40 text-sm">Nenhum aluno entrou no bolão ainda.</p>
          ) : (
            <div className="space-y-2">
              {standings.slice(0, 15).map((s) => (
                <div key={s.userId} className="flex items-center gap-3 rounded-xl bg-ink/40 border border-white/5 px-4 py-2.5">
                  <span className={`font-display w-8 text-center ${s.rank <= 3 ? "text-brand text-lg" : "text-white/50"}`}>
                    {["🥇", "🥈", "🥉"][s.rank - 1] ?? s.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-white/80">{s.name}</p>
                    <p className="text-[11px] text-white/40">{s.predictions} palpite(s) · {s.exact} exato(s)</p>
                  </div>
                  <span className="font-display text-lg text-brand tabular-nums">{s.points}<span className="text-xs text-white/40 ml-1">pts</span></span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-white/35">
          O prêmio acumulado vai para o 1º lugar da sua unidade no fim da Copa (empate divide).
        </p>
      </div>
    </main>
  );
}
