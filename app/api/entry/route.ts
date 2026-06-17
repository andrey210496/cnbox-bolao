import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { getEconomics, splitAmount } from "@/lib/economics";
import { createCustomer, createCheckoutPayment } from "@/lib/asaas";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

export const MIN_ENTRY = 50;

// POST: cria a cobrança da ENTRADA no bolão (pagamento único da unidade do aluno).
export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  maybeSweep();
  if (!rateLimit(`entry:${uid}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        fullName: true,
        cpf: true,
        unitId: true,
        unit: { select: { entryFee: true, active: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Usuário inválido." }, { status: 401 });
    if (!user.unitId || !user.unit)
      return NextResponse.json({ error: "Você precisa estar em uma unidade." }, { status: 400 });

    // já participa?
    const confirmed = await prisma.entry.findFirst({
      where: { userId: uid, status: "CONFIRMED" },
      select: { id: true },
    });
    if (confirmed)
      return NextResponse.json({ error: "Você já está no bolão.", id: confirmed.id }, { status: 400 });

    // reaproveita entrada pendente com cobrança válida
    const pending = await prisma.entry.findFirst({
      where: { userId: uid, status: "PENDING", checkoutUrl: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (pending) return NextResponse.json({ id: pending.id });

    const eco = await getEconomics();
    const amount = Math.max(MIN_ENTRY, user.unit.entryFee ?? MIN_ENTRY);
    const split = splitAmount(amount, eco.house_percent, eco.unit_percent, true);

    const customer = await createCustomer({
      name: user.fullName,
      cpfCnpj: user.cpf,
      externalReference: uid,
    });

    // limpa entradas pendentes antigas (sem cobrança) para manter 1 ativa
    await prisma.entry.deleteMany({
      where: { userId: uid, status: "PENDING" },
    });

    const entry = await prisma.entry.create({
      data: {
        userId: uid,
        unitId: user.unitId,
        amount,
        prizeContribution: split.prizeContribution,
        houseCut: split.houseCut,
        unitCommission: split.unitCommission,
        status: "PENDING",
        asaasCustomerId: customer.id,
      },
      select: { id: true },
    });

    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    try {
      const payment = await createCheckoutPayment({
        customer: customer.id,
        value: amount,
        description: "Entrada no Bolão CNBOX — Copa do Mundo",
        externalReference: entry.id,
        successUrl: `${site}/entrada/${entry.id}`,
      });
      await prisma.entry.update({
        where: { id: entry.id },
        data: { asaasPaymentId: payment.id, checkoutUrl: payment.invoiceUrl },
      });
    } catch (err) {
      await prisma.entry.delete({ where: { id: entry.id } }).catch(() => {});
      throw err;
    }

    return NextResponse.json({ id: entry.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar o pagamento.";
    console.error("[entry] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
