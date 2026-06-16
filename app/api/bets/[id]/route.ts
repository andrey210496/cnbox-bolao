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
  const bet = await prisma.bet.findUnique({
    where: { id },
    include: { game: { select: { homeTeam: true, awayTeam: true } } },
  });
  if (!bet || bet.userId !== uid) {
    return NextResponse.json({ error: "Palpite não encontrado." }, { status: 404 });
  }

  // Auto-confirma consultando o Asaas (fallback do webhook)
  if (bet.status === "PENDING" && bet.asaasPaymentId) {
    try {
      const payment = await getPayment(bet.asaasPaymentId);
      if (isPaidStatus(payment.status)) {
        await prisma.bet.update({
          where: { id: bet.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(payment) },
        });
        bet.status = "CONFIRMED";
      }
    } catch (err) {
      console.error("[bet status] asaas:", err);
    }
  }

  return NextResponse.json({
    id: bet.id,
    status: bet.status,
    homeScore: bet.homeScore,
    awayScore: bet.awayScore,
    amount: bet.amount,
    checkoutUrl: bet.checkoutUrl,
    homeTeam: bet.game.homeTeam,
    awayTeam: bet.game.awayTeam,
  });
}
