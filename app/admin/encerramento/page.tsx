import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import SeasonPayout from "@/components/admin/SeasonPayout";

export const dynamic = "force-dynamic";

export default async function EncerramentoPage() {
  if (!(await isAdmin())) redirect("/admin");
  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl">ENCERRA<span className="text-brand">MENTO</span></h1>
          <p className="text-white/50 text-sm mt-1">
            Apuração final: o 1º lugar de cada unidade leva o prêmio acumulado da unidade
            (empate divide). Pague pelo PIX em massa.
          </p>
        </div>
        <SeasonPayout />
      </div>
    </div>
  );
}
