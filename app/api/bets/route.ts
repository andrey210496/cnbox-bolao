import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";
import { getEconomics, splitAmount } from "@/lib/economics";
import { createCustomer, createPixPayment, getPixQrCode } from "@/lib/asaas";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const uid = await getUserId();
  if (!uid) {
    return NextResponse.json({ error: "Faça login para palpitar." }, { status: 401 });
  }
  maybeSweep();
  if (!rateLimit(`bets:${uid}`, 25, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitos palpites em sequência. Aguarde um instante." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const gameId = String(body?.gameId ?? "");
    const homeScore = Number(body?.homeScore);
    const awayScore = Number(body?.awayScore);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0 ||
      homeScore > 30 ||
      awayScore > 30
    ) {
      return NextResponse.json({ error: "Placar inválido." }, { status: 400 });
    }

    // Jogo precisa existir e estar ABERTO (validação no servidor)
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
    }
    if (game.status !== "SCHEDULED" || Date.now() >= new Date(game.kickoffAt).getTime()) {
      return NextResponse.json(
        { error: "Os palpites deste jogo estão encerrados." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, fullName: true, cpf: true, unitId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuário inválido." }, { status: 401 });
    }

    const eco = await getEconomics();
    const split = splitAmount(
      eco.bet_price,
      eco.house_percent,
      eco.unit_percent,
      Boolean(user.unitId)
    );

    // 1) Cliente no Asaas
    const customer = await createCustomer({
      name: user.fullName,
      cpfCnpj: user.cpf,
      externalReference: user.id,
    });

    // 2) Cobrança PIX
    const description = `Bolão CNBOX — ${game.homeTeam} x ${game.awayTeam} | Palpite ${homeScore}x${awayScore}`;
    const payment = await createPixPayment({
      customer: customer.id,
      value: eco.bet_price,
      description,
    });

    // 3) QR Code PIX
    const qr = await getPixQrCode(payment.id);

    // 4) Salva o palpite
    const bet = await prisma.bet.create({
      data: {
        userId: user.id,
        gameId: game.id,
        unitId: user.unitId,
        homeScore,
        awayScore,
        amount: eco.bet_price,
        prizeContribution: split.prizeContribution,
        houseCut: split.houseCut,
        unitCommission: split.unitCommission,
        status: "PENDING",
        asaasCustomerId: customer.id,
        asaasPaymentId: payment.id,
        pixPayload: qr.payload,
        pixQrImage: qr.encodedImage,
        pixExpiration: qr.expirationDate ? new Date(qr.expirationDate) : null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: bet.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar o PIX.";
    console.error("[bets] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
