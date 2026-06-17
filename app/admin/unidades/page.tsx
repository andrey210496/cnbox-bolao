import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getUnitsOverview } from "@/lib/units";
import { formatBRL } from "@/lib/format";
import CleanupInactiveUnits from "@/components/admin/CleanupInactiveUnits";

export const dynamic = "force-dynamic";

function fmtWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function UnidadesPage() {
  if (!(await isAdmin())) redirect("/admin");

  const { units, totals, noUnit } = await getUnitsOverview();
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">
              UNI<span className="text-brand">DADES</span>
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Desempenho e comissões por unidade. Ranking pela comissão acumulada.
            </p>
          </div>
          <CleanupInactiveUnits count={totals.units - totals.active} />
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Stat label="Unidades" value={`${totals.active}/${totals.units}`} hint="ativas/total" />
          <Stat label="Alunos vinculados" value={String(totals.students)} />
          <Stat label="Palpites pagos" value={String(totals.betsConfirmed)} />
          <Stat label="Arrecadado via unidades" value={formatBRL(totals.revenue)} accent />
          <Stat label="Comissões (a pagar)" value={formatBRL(totals.commission)} accent />
        </div>

        {/* Ranking / tabela */}
        <section className="card-premium rounded-3xl p-5 sm:p-6">
          <h2 className="font-display text-2xl mb-4">
            RANKING DE <span className="text-brand">UNIDADES</span>
          </h2>

          {units.length === 0 ? (
            <p className="text-white/40 text-sm">Nenhuma unidade cadastrada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="text-white/45 text-left text-xs uppercase tracking-wider">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Unidade</th>
                    <th className="py-2 px-3 font-medium text-right">Alunos</th>
                    <th className="py-2 px-3 font-medium text-right">Pagos</th>
                    <th className="py-2 px-3 font-medium text-right">Pend.</th>
                    <th className="py-2 px-3 font-medium text-right">Conv.</th>
                    <th className="py-2 px-3 font-medium text-right">Arrecadado</th>
                    <th className="py-2 px-3 font-medium text-right">Ticket méd.</th>
                    <th className="py-2 px-3 font-medium text-right">Comissão</th>
                    <th className="py-2 pl-3 font-medium">Último palpite</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u, i) => (
                    <tr key={u.id} className="border-t border-white/5 align-top">
                      <td className="py-3 pr-3 text-white/50">{medals[i] ?? i + 1}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium flex items-center gap-2">
                          {u.name}
                          {u.active ? (
                            <span className="text-[10px] rounded-full bg-brand/15 border border-brand/30 px-2 py-0.5 text-brand">ATIVA</span>
                          ) : (
                            <span className="text-[10px] rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-amber-300">INATIVA</span>
                          )}
                        </p>
                        {u.activatedAt && (
                          <p className="text-[11px] text-white/30">ativada em {fmtWhen(u.activatedAt)}</p>
                        )}
                        <p className="text-xs text-white/40">
                          {u.holderName ? u.holderName : "sem responsável"}
                          {u.holderPhone ? ` · ${u.holderPhone}` : ""}
                        </p>
                        {u.pixKey && (
                          <p className="text-[11px] text-white/30">PIX: {u.pixKey}</p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-white/70">{u.students}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-brand-light">{u.betsConfirmed}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-amber-300/80">{u.betsPending}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-white/60">{u.conversion}%</td>
                      <td className="py-3 px-3 text-right tabular-nums text-white/80">{formatBRL(u.revenue)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-white/60">{formatBRL(u.avgTicket)}</td>
                      <td className="py-3 px-3 text-right tabular-nums text-brand font-semibold">{formatBRL(u.commission)}</td>
                      <td className="py-3 pl-3 text-white/50 text-xs whitespace-nowrap">{fmtWhen(u.lastBetAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sem unidade */}
        {(noUnit.students > 0 || noUnit.betsConfirmed > 0) && (
          <section className="card-premium rounded-3xl p-5 sm:p-6">
            <h2 className="font-display text-xl mb-2">
              SEM <span className="text-brand">UNIDADE</span>
            </h2>
            <p className="text-white/45 text-sm mb-3">
              Alunos/palpites que não estão ligados a nenhuma unidade (não geram comissão).
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Alunos" value={String(noUnit.students)} />
              <Stat label="Palpites pagos" value={String(noUnit.betsConfirmed)} />
              <Stat label="Arrecadado" value={formatBRL(noUnit.revenue)} />
            </div>
          </section>
        )}

        <p className="text-center text-xs text-white/30">
          Comissão = soma da fatia da unidade nos palpites pagos. Conversão = palpites pagos ÷
          total de palpites da unidade.
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card-premium rounded-2xl p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p
        className={`font-display text-2xl mt-1 tabular-nums ${
          accent ? "text-brand text-glow" : "text-white"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-white/40 mt-0.5">{hint}</p>}
    </div>
  );
}
