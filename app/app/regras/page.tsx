import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import RulesContent from "@/components/RulesContent";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getEconomics, prizePercent } from "@/lib/economics";

export const dynamic = "force-dynamic";
const MIN_ENTRY = 50;

export default async function RegrasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");

  const eco = await getEconomics();
  const unit = user.unitId
    ? await prisma.unit.findUnique({ where: { id: user.unitId }, select: { entryFee: true } }).catch(() => null)
    : null;
  const entryFee = unit ? Math.max(MIN_ENTRY, unit.entryFee ?? MIN_ENTRY) : null;

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[900px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/app"><Logo height={30} /></Link>
          <Link href="/app" className="text-sm text-white/60 hover:text-white">← Voltar</Link>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl mb-1">REGRAS E <span className="text-brand text-glow">INFORMAÇÕES</span></h1>
        <p className="text-white/55 text-sm mb-6">Tudo sobre o bolão da sua unidade, transparente.</p>
        <RulesContent
          prizePct={prizePercent(eco.house_percent, eco.unit_percent)}
          housePct={eco.house_percent}
          unitPct={eco.unit_percent}
          specialistPrice={eco.specialist_price}
          minEntry={MIN_ENTRY}
          entryFee={entryFee}
        />
      </div>
    </main>
  );
}
