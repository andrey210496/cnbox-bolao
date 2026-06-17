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

    // ---------- Pagamentos (entrada no bolão e dicas do Especialista) ----------
    if (type.startsWith("PAYMENT_") && event?.payment?.id) {
      const p = event.payment;
      const paid =
        type === "PAYMENT_RECEIVED" ||
        type === "PAYMENT_CONFIRMED" ||
        isPaidStatus(p.status ?? "");

      const entry = await prisma.entry.findUnique({ where: { asaasPaymentId: p.id } });
      if (entry) {
        if (paid && entry.status !== "CONFIRMED") {
          await prisma.entry.update({
            where: { id: entry.id },
            data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
          });
        } else if (type === "PAYMENT_REFUNDED" && entry.status !== "REFUNDED") {
          await prisma.entry.update({ where: { id: entry.id }, data: { status: "REFUNDED" } });
        } else if (
          ["PAYMENT_OVERDUE", "PAYMENT_DELETED"].includes(type) &&
          entry.status === "PENDING"
        ) {
          await prisma.entry.update({ where: { id: entry.id }, data: { status: "EXPIRED" } });
        }
        return NextResponse.json({ ok: true });
      }

      // Senão, pode ser um pedido do Especialista (IA paga)
      const order = await prisma.specialistOrder.findUnique({
        where: { asaasPaymentId: p.id },
      });
      if (order) {
        if (paid && order.status !== "CONFIRMED") {
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
