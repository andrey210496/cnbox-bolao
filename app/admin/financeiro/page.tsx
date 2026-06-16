import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getFinanceOverview } from "@/lib/finance";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  // d = YYYY-MM-DD
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
            Dados em tempo real da sua conta Asaas (valores líquidos já com a tarifa
            descontada).
          </p>
        </div>

        {!fin.ok ? (
          <div className="card-premium rounded-3xl p-8 text-center">
            <p className="text-red-400 font-medium">Não foi possível carregar os dados do Asaas.</p>
            <p className="text-white/50 text-sm mt-2">{fin.error}</p>
            <p className="text-white/40 text-xs mt-4">
              Verifique se a <code className="text-brand">ASAAS_API_KEY</code> está configurada e válida.
            </p>
          </div>
        ) : (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Card label="Saldo disponível" value={formatBRL(fin.balance)} accent big />
              <Card label="Recebido (líquido)" value={formatBRL(fin.received.netValue)} accent />
              <Card
                label="A receber (líquido)"
                value={formatBRL(fin.confirmed.netValue)}
                hint="pago, aguardando liberação"
              />
              <Card
                label="Tarifas descontadas"
                value={formatBRL(fin.received.fees)}
                hint={`≈ ${fin.feeRate}% sobre o recebido`}
                danger
              />
              <Card
                label="Aguardando pagamento"
                value={formatBRL(fin.pending.value)}
                hint={`${fin.pending.quantity} cobrança(s)`}
              />
              <Card
                label="Transações recebidas"
                value={String(fin.received.quantity)}
                hint="cobranças pagas"
              />
            </div>

            {/* Por método */}
            <section className="card-premium rounded-3xl p-6">
              <h2 className="font-display text-2xl mb-1">
                POR <span className="text-brand">MÉTODO</span>
              </h2>
              <p className="text-white/45 text-sm mb-4">
                Recebido por forma de pagamento, com a tarifa de cada uma.
              </p>
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
                  Nada aguardando liberação. Tudo que foi pago já está no saldo. ✅
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
              Tarifa = valor bruto − valor líquido, conforme calculado pelo Asaas. Valores
              consideram todas as cobranças da conta.
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
    <div className={`card-premium rounded-2xl p-5 ${big ? "lg:col-span-1" : ""}`}>
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
