import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getFinanceOverview } from "@/lib/finance";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  if (!y) return d;
  return new Date(Number(y), Number(m) - 1, Number(day)).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  });
}

export default async function FinanceiroPage() {
  if (!(await isAdmin())) redirect("/admin");

  const fin = await getFinanceOverview();

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-8 space-y-8">
        <div>
          <h1 className="font-display text-3xl">
            FINAN<span className="text-brand">CEIRO</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Apenas movimentações do <strong className="text-white/70">Bolão CNBOX</strong>{" "}
            (palpites e dicas). Valores líquidos já com a tarifa do Asaas descontada.
          </p>
        </div>

        {!fin.ok ? (
          <div className="card-premium rounded-3xl p-8 text-center">
            <p className="text-red-400 font-medium">Não foi possível calcular as métricas.</p>
            <p className="text-white/50 text-sm mt-2">{fin.error}</p>
          </div>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card label="Arrecadado (bruto)" value={formatBRL(fin.gross)} accent big />
              <Card
                label="Lucro da casa (líquido)"
                value={formatBRL(fin.houseNet)}
                hint="após prêmios, comissões e tarifas"
                accent
              />
              <Card
                label="Tarifas Asaas"
                value={formatBRL(fin.fees)}
                hint={`≈ ${fin.feeRate}% sobre o que tem líquido`}
                danger
              />
              <Card
                label="Prêmios a distribuir"
                value={formatBRL(fin.prizePool)}
                hint={`${fin.entriesCount} entrada(s)`}
              />
              <Card label="Comissões das unidades" value={formatBRL(fin.commissions)} />
              <Card
                label="Aguardando pagamento"
                value={formatBRL(fin.pendingAmount)}
                hint={`${fin.pendingCount} cobrança(s)`}
              />
            </div>

            {/* Especialista (à parte, 100% da casa) */}
            <section className="card-premium rounded-3xl p-6">
              <h2 className="font-display text-2xl mb-1">
                ESPECIALISTA <span className="text-brand">IA</span>
              </h2>
              <p className="text-white/45 text-sm mb-4">
                Dicas vendidas (100% da casa, fora do prêmio).
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card label="Dicas vendidas" value={String(fin.specialistCount)} />
                <Card label="Total das dicas" value={formatBRL(fin.specialistTotal)} accent />
                <Card label="Unidades ativadas" value={String(fin.activationsCount)} />
                <Card label="Total ativações" value={formatBRL(fin.activationsTotal)} accent />
              </div>
            </section>

            {/* Por método */}
            <section className="card-premium rounded-3xl p-6">
              <h2 className="font-display text-2xl mb-1">
                POR <span className="text-brand">MÉTODO</span>
              </h2>
              <p className="text-white/45 text-sm mb-4">
                Recebido por forma de pagamento, com a tarifa de cada uma.
              </p>
              {fin.methods.length === 0 ? (
                <p className="text-white/40 text-sm">
                  Ainda não há pagamentos confirmados com método identificado.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="text-white/45 text-left text-xs uppercase tracking-wider">
                        <th className="py-2 pr-4 font-medium">Método</th>
                        <th className="py-2 px-4 font-medium text-right">Qtd</th>
                        <th className="py-2 px-4 font-medium text-right">Bruto</th>
                        <th className="py-2 px-4 font-medium text-right">Tarifa</th>
                        <th className="py-2 pl-4 font-medium text-right">Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fin.methods.map((m) => (
                        <tr key={m.method} className="border-t border-white/5">
                          <td className="py-3 pr-4 font-medium">{m.label}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-white/70">{m.quantity}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-white/70">{formatBRL(m.gross)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-red-300/80">−{formatBRL(m.fees)}</td>
                          <td className="py-3 pl-4 text-right tabular-nums text-brand-light font-semibold">{formatBRL(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Prazos de liberação */}
            <section className="card-premium rounded-3xl p-6">
              <h2 className="font-display text-2xl mb-1">
                PRAZOS DE <span className="text-brand">LIBERAÇÃO</span>
              </h2>
              <p className="text-white/45 text-sm mb-4">
                Valores pagos (geralmente cartão) aguardando crédito na conta, por data
                estimada. PIX cai na hora.
              </p>
              {fin.upcoming.length === 0 ? (
                <p className="text-white/40 text-sm">
                  Nada aguardando liberação. ✅
                </p>
              ) : (
                <div className="space-y-2">
                  {fin.upcoming.map((b) => (
                    <div
                      key={b.date}
                      className="flex items-center justify-between rounded-xl bg-ink/40 border border-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-brand">📅</span>
                        <span className="text-sm text-white/80 capitalize">{fmtDate(b.date)}</span>
                        <span className="text-xs text-white/40">{b.quantity} pagamento(s)</span>
                      </div>
                      <span className="font-display text-lg text-brand-light tabular-nums">
                        {formatBRL(b.net)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-center text-xs text-white/30">
              Tarifa = valor bruto − valor líquido informado pelo Asaas em cada pagamento do
              bolão. Pagamentos confirmados antes desta atualização podem não ter a tarifa
              registrada.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  hint,
  accent,
  danger,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  danger?: boolean;
  big?: boolean;
}) {
  return (
    <div className="card-premium rounded-2xl p-5">
      <p className="text-xs text-white/50">{label}</p>
      <p
        className={`font-display mt-1 tabular-nums ${big ? "text-3xl" : "text-2xl"} ${
          danger ? "text-red-300" : accent ? "text-brand text-glow" : "text-white"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}
