import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import RulesContent from "@/components/RulesContent";
import { getHolderUnitId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEconomics, prizePercent } from "@/lib/economics";

export const dynamic = "force-dynamic";
const MIN_ENTRY = 50;

export default async function ParceiroRegrasPage() {
  const unitId = await getHolderUnitId();
  if (!unitId) redirect("/parceiro/entrar");

  const [eco, unit] = await Promise.all([
    getEconomics(),
    prisma.unit.findUnique({ where: { id: unitId }, select: { entryFee: true } }).catch(() => null),
  ]);
  const entryFee = unit ? Math.max(MIN_ENTRY, unit.entryFee ?? MIN_ENTRY) : null;

  return (
    <main className="flex-1 w-full">
      <div className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[900px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/parceiro/painel"><Logo height={30} /></Link>
          <div className="flex items-center gap-3">
            <Link href="/parceiro/painel" className="text-sm text-white/60 hover:text-white">← Painel</Link>
            <LogoutButton endpoint="/api/units/logout" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[900px] px-4 sm:px-8 py-8">
        <h1 className="font-display text-3xl mb-1">REGRAS E <span className="text-brand text-glow">INFORMAÇÕES</span></h1>
        <p className="text-white/55 text-sm mb-6">Use estas informações para explicar o bolão aos seus alunos.</p>
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
