import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPaidStatus, paymentSnapshot } from "@/lib/asaas";

// Webhook do Asaas — confirma pagamentos (palpites) e transferências (prêmios).
// Configure em Asaas > Configurações > Webhooks:
//   URL: https://SEU_DOMINIO/api/webhook/asaas
//   Token de autenticação: igual ao ASAAS_WEBHOOK_TOKEN do .env
export async function POST(req: Request) {
  const token = req.headers.get("asaas-access-token");
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  try {
    const event = await req.json();
    const type: string = event?.event ?? "";

    // ---------- Pagamentos (palpites) ----------
    if (type.startsWith("PAYMENT_") && event?.payment?.id) {
      const p = event.payment;
      const bet = await prisma.bet.findUnique({ where: { asaasPaymentId: p.id } });
      if (!bet) {
        // Pode ser um pedido do Especialista (IA paga)
        const order = await prisma.specialistOrder.findUnique({
          where: { asaasPaymentId: p.id },
        });
        if (order) {
          const paidNow =
            type === "PAYMENT_RECEIVED" ||
            type === "PAYMENT_CONFIRMED" ||
            isPaidStatus(p.status ?? "");
          if (paidNow && order.status !== "CONFIRMED") {
            await prisma.specialistOrder.update({
              where: { id: order.id },
              data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
            });
          } else if (type === "PAYMENT_REFUNDED" && order.status !== "REFUNDED") {
            await prisma.specialistOrder.update({
              where: { id: order.id },
              data: { status: "REFUNDED" },
            });
          }
        }
        return NextResponse.json({ ok: true });
      }

      const paid =
        type === "PAYMENT_RECEIVED" ||
        type === "PAYMENT_CONFIRMED" ||
        isPaidStatus(p.status ?? "");

      if (paid && bet.status !== "CONFIRMED") {
        await prisma.bet.update({
          where: { id: bet.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
        });
      } else if (type === "PAYMENT_REFUNDED" && bet.status !== "REFUNDED") {
        await prisma.bet.update({
          where: { id: bet.id },
          data: { status: "REFUNDED", isWinner: false },
        });
      } else if (
        ["PAYMENT_OVERDUE", "PAYMENT_DELETED"].includes(type) &&
        bet.status === "PENDING"
      ) {
        await prisma.bet.update({ where: { id: bet.id }, data: { status: "EXPIRED" } });
      }
      return NextResponse.json({ ok: true });
    }

    // ---------- Transferências (prêmios pagos) ----------
    if (type.startsWith("TRANSFER_") && event?.transfer?.id) {
      const t = event.transfer;
      const payout = await prisma.payout.findUnique({
        where: { asaasTransferId: t.id },
      });
      if (!payout) return NextResponse.json({ ok: true });

      if (["DONE", "RECEIVED"].includes(t.status) && payout.status !== "SENT") {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: "SENT", sentAt: new Date(), failReason: null },
        });
      } else if (["FAILED", "CANCELLED"].includes(t.status)) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: { status: "FAILED", failReason: t.status },
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook asaas] erro:", err);
    return NextResponse.json({ ok: true });
  }
}
