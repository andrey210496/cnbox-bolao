import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { getPayment, isPaidStatus, paymentSnapshot } from "@/lib/asaas";

// Ações do admin sobre um palpite: recheck | confirm | expire
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? "");

  const bet = await prisma.bet.findUnique({ where: { id } });
  if (!bet) return NextResponse.json({ error: "Palpite não encontrado." }, { status: 404 });

  try {
    if (action === "recheck") {
      if (!bet.asaasPaymentId)
        return NextResponse.json({ error: "Sem cobrança no Asaas." }, { status: 400 });
      const p = await getPayment(bet.asaasPaymentId);
      if (isPaidStatus(p.status) && bet.status !== "CONFIRMED") {
        await prisma.bet.update({
          where: { id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
        });
        return NextResponse.json({ ok: true, status: "CONFIRMED" });
      }
      if (["REFUNDED", "REFUND_REQUESTED"].includes(p.status)) {
        await prisma.bet.update({ where: { id }, data: { status: "REFUNDED" } });
        return NextResponse.json({ ok: true, status: "REFUNDED" });
      }
      return NextResponse.json({ ok: true, status: bet.status, asaas: p.status });
    }

    if (action === "confirm") {
      let snap = {};
      if (bet.asaasPaymentId) {
        try {
          snap = paymentSnapshot(await getPayment(bet.asaasPaymentId));
        } catch {}
      }
      await prisma.bet.update({
        where: { id },
        data: { status: "CONFIRMED", confirmedAt: new Date(), ...snap },
      });
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }

    if (action === "expire") {
      await prisma.bet.update({ where: { id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ ok: true, status: "EXPIRED" });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na ação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { id } = await params;
  // não deixa apagar palpite com prêmio já gerado
  const payout = await prisma.payout.findUnique({ where: { betId: id } }).catch(() => null);
  if (payout)
    return NextResponse.json(
      { error: "Este palpite tem um prêmio vinculado. Não pode ser excluído." },
      { status: 400 }
    );

  await prisma.bet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
