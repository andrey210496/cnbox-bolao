import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { getPayment, isPaidStatus, paymentSnapshot } from "@/lib/asaas";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry || entry.userId !== uid) {
    return NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 });
  }

  // Auto-confirma consultando o Asaas (fallback do webhook)
  if (entry.status === "PENDING" && entry.asaasPaymentId) {
    try {
      const p = await getPayment(entry.asaasPaymentId);
      if (isPaidStatus(p.status)) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
        });
        entry.status = "CONFIRMED";
      }
    } catch (err) {
      console.error("[entry status] asaas:", err);
    }
  }

  return NextResponse.json({
    id: entry.id,
    status: entry.status,
    amount: entry.amount,
    checkoutUrl: entry.checkoutUrl,
  });
}
