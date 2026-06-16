import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment, isPaidStatus, paymentSnapshot } from "@/lib/asaas";

// Reconciliação de backup: confirma palpites pagos que o webhook não pegou.
// Chame por um cron (EasyPanel/externo) a cada 1-2 min:
//   GET /api/cron/reconcile?key=SEU_CRON_SECRET
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || req.headers.get("x-cron-key");
  const secret = process.env.CRON_SECRET;
  if (!secret || key !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  // Só palpites recentes ainda pendentes (limite por execução p/ não estourar rate limit)
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3); // 3 dias
  const pend = await prisma.bet.findMany({
    where: {
      status: "PENDING",
      asaasPaymentId: { not: null },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  let confirmed = 0;
  for (const b of pend) {
    try {
      const payment = await getPayment(b.asaasPaymentId!);
      if (isPaidStatus(payment.status)) {
        await prisma.bet.update({
          where: { id: b.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(payment) },
        });
        confirmed++;
      } else if (["REFUNDED", "REFUND_REQUESTED"].includes(payment.status)) {
        await prisma.bet.update({
          where: { id: b.id },
          data: { status: "REFUNDED" },
        });
      }
    } catch {
      // ignora e tenta no próximo ciclo
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  // Pedidos do Especialista (IA) pendentes
  const orders = await prisma.specialistOrder.findMany({
    where: {
      status: "PENDING",
      asaasPaymentId: { not: null },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    take: 40,
  });
  let specialistConfirmed = 0;
  for (const o of orders) {
    try {
      const p = await getPayment(o.asaasPaymentId!);
      if (isPaidStatus(p.status)) {
        await prisma.specialistOrder.update({
          where: { id: o.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
        });
        specialistConfirmed++;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({
    checked: pend.length,
    confirmed,
    specialistChecked: orders.length,
    specialistConfirmed,
  });
}
