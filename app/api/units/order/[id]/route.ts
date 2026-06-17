import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHolderUnitId } from "@/lib/auth";
import { getPayment, isPaidStatus, paymentSnapshot } from "@/lib/asaas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unitId = await getHolderUnitId();
  if (!unitId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const order = await prisma.unitOrder.findUnique({ where: { id } });
  if (!order || order.unitId !== unitId) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  // Auto-confirma e ativa a unidade
  if (order.status === "PENDING" && order.asaasPaymentId) {
    try {
      const p = await getPayment(order.asaasPaymentId);
      if (isPaidStatus(p.status)) {
        await prisma.unitOrder.update({
          where: { id: order.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
        });
        await prisma.unit.update({ where: { id: order.unitId }, data: { active: true } });
        order.status = "CONFIRMED";
      }
    } catch (err) {
      console.error("[unit order] asaas:", err);
    }
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    amount: order.amount,
    checkoutUrl: order.checkoutUrl,
  });
}
