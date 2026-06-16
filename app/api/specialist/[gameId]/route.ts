import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { getEconomics } from "@/lib/economics";
import {
  createCustomer,
  createCheckoutPayment,
  getPayment,
  isPaidStatus,
  paymentSnapshot,
} from "@/lib/asaas";
import { hasUnusedDica } from "@/lib/specialist";
import { isOpen } from "@/lib/games";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

// GET: tem dica disponível? + pedido pendente (para a tela de pagamento)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { gameId } = await params;

  if (await hasUnusedDica(uid, gameId)) {
    return NextResponse.json({ hasDica: true, order: null });
  }

  // pedido pago aguardando confirmação ou pendente de pagamento
  const order = await prisma.specialistOrder.findFirst({
    where: { userId: uid, gameId, status: { in: ["PENDING", "CONFIRMED"] }, usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  // auto-confirma consultando o Asaas
  if (order && order.status === "PENDING" && order.asaasPaymentId) {
    try {
      const p = await getPayment(order.asaasPaymentId);
      if (isPaidStatus(p.status)) {
        await prisma.specialistOrder.update({
          where: { id: order.id },
          data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) },
        });
        return NextResponse.json({ hasDica: true, order: null });
      }
    } catch {}
  }

  return NextResponse.json({
    hasDica: false,
    order:
      order && order.status === "PENDING"
        ? {
            id: order.id,
            status: order.status,
            amount: order.amount,
            checkoutUrl: order.checkoutUrl,
          }
        : null,
  });
}

// POST: contratar o Especialista (gera cobrança PIX)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  maybeSweep();
  if (!rateLimit(`specialist:${uid}`, 15, 5 * 60 * 1000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
  }
  const { gameId } = await params;

  try {
    if (await hasUnusedDica(uid, gameId)) {
      return NextResponse.json(
        { error: "Você já tem uma dica disponível para este jogo. Use-a primeiro." },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
    if (!isOpen(game))
      return NextResponse.json(
        { error: "Este jogo já começou ou está fechado — dica indisponível." },
        { status: 400 }
      );

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { fullName: true, cpf: true },
    });
    if (!user) return NextResponse.json({ error: "Usuário inválido." }, { status: 401 });

    // reaproveita pedido pendente, se houver
    const pending = await prisma.specialistOrder.findFirst({
      where: { userId: uid, gameId, status: "PENDING", checkoutUrl: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (pending) return NextResponse.json({ id: pending.id });

    const eco = await getEconomics();
    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const customer = await createCustomer({
      name: user.fullName,
      cpfCnpj: user.cpf,
      externalReference: uid,
    });

    const order = await prisma.specialistOrder.create({
      data: {
        userId: uid,
        gameId,
        amount: eco.specialist_price,
        status: "PENDING",
        asaasCustomerId: customer.id,
      },
      select: { id: true },
    });

    try {
      const payment = await createCheckoutPayment({
        customer: customer.id,
        value: eco.specialist_price,
        description: `Especialista CNBOX — ${game.homeTeam} x ${game.awayTeam}`,
        externalReference: order.id,
        successUrl: `${site}/app/jogo/${gameId}#especialista`,
      });
      await prisma.specialistOrder.update({
        where: { id: order.id },
        data: { asaasPaymentId: payment.id, checkoutUrl: payment.invoiceUrl },
      });
    } catch (err) {
      await prisma.specialistOrder.delete({ where: { id: order.id } }).catch(() => {});
      throw err;
    }

    return NextResponse.json({ id: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar o pagamento.";
    console.error("[specialist] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
