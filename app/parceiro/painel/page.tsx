import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import CopyLinkBox from "@/components/CopyLinkBox";
import { getHolderUnitId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/economics";

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

  const [confirmed, pending, students] = await Promise.all([
    prisma.bet.aggregate({
      where: { unitId, status: "CONFIRMED" },
      _sum: { unitCommission: true, amount: true },
      _count: { _all: true },
    }),
    prisma.bet.count({ where: { unitId, status: "PENDING" } }),
    prisma.user.count({ where: { unitId } }),
  ]);

  const commission = confirmed._sum.unitCommission ?? 0;
  const arrecadado = confirmed._sum.amount ?? 0;
  const palpites = confirmed._count._all;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const link = `${base}/u/${unit.slug}`;

  const firstName = (unit.holderName ?? "Responsável").split(" ")[0];

  const stats = [
    { label: "Comissão acumulada", value: formatBRL(commission), accent: true },
    { label: "Palpites confirmados", value: String(palpites) },
    { label: "Alunos cadastrados", value: String(students) },
    { label: "Arrecadado pela unidade", value: formatBRL(arrecadado) },
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
