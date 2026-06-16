import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { computePayoutPreview } from "@/lib/payouts";
import { createPixTransfer, getBalance, isTransferFailed } from "@/lib/asaas";
import { round2 } from "@/lib/format";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { gameId } = await params;

  try {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });

    const preview = await computePayoutPreview(gameId);
    const payouts = await prisma.payout.findMany({
      where: { gameId },
      orderBy: { createdAt: "asc" },
    });
    let balance = 0;
    try {
      balance = await getBalance();
    } catch {}

    return NextResponse.json({
      game: {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        finalHome: game.finalHome,
        finalAway: game.finalAway,
        payoutStatus: game.payoutStatus,
      },
      preview,
      payouts,
      balance,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro." },
      { status: 400 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { gameId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  try {
    // ----- Gerar/atualizar a lista de pagamentos (idempotente) -----
    if (action === "approve") {
      const preview = await computePayoutPreview(gameId);
      if (preview.count === 0) {
        await prisma.game.update({
          where: { id: gameId },
          data: { payoutStatus: "PAID" }, // ninguém acertou -> nada a pagar
        });
        return NextResponse.json({ ok: true, count: 0 });
      }
      for (const w of preview.winners) {
        await prisma.payout.upsert({
          where: { betId: w.betId },
          update: { amount: w.amount, pixKey: w.pixKey }, // atualiza valor enquanto não pago
          create: {
            betId: w.betId,
            gameId,
            userId: w.userId,
            pixKey: w.pixKey,
            amount: w.amount,
            status: "PENDING",
          },
        });
      }
      await prisma.game.update({
        where: { id: gameId },
        data: { payoutStatus: "APPROVED" },
      });
      await prisma.auditLog
        .create({
          data: {
            action: "payout_approved",
            actor: "admin",
            detail: `jogo ${gameId} · ${preview.count} ganhadores · ${preview.pool}`,
          },
        })
        .catch(() => {});
      return NextResponse.json({ ok: true, count: preview.count });
    }

    // ----- Disparar os PIX em massa (idempotente: só PENDING/FAILED) -----
    if (action === "pay") {
      const toPay = await prisma.payout.findMany({
        where: { gameId, status: { in: ["PENDING", "FAILED"] } },
        include: { bet: { include: { user: { select: { pixKeyType: true, fullName: true } } } } },
      });
      if (toPay.length === 0)
        return NextResponse.json({ ok: true, paid: 0, failed: 0 });

      const total = round2(toPay.reduce((s, p) => s + p.amount, 0));
      let balance = 0;
      try {
        balance = await getBalance();
      } catch {}
      if (balance < total) {
        return NextResponse.json(
          {
            error: `Saldo insuficiente no Asaas. Necessário ${total}, disponível ${balance}.`,
          },
          { status: 400 }
        );
      }

      let paid = 0;
      let failed = 0;
      for (const p of toPay) {
        try {
          await prisma.payout.update({
            where: { id: p.id },
            data: { status: "PROCESSING" },
          });
          const transfer = await createPixTransfer({
            value: p.amount,
            pixKey: p.pixKey,
            pixKeyType: p.bet.user.pixKeyType,
            description: `Prêmio Bolão CNBOX`,
            externalReference: p.id,
          });
          const failedStatus = isTransferFailed(transfer.status);
          await prisma.payout.update({
            where: { id: p.id },
            data: {
              status: failedStatus ? "FAILED" : "SENT",
              asaasTransferId: transfer.id,
              sentAt: failedStatus ? null : new Date(),
              failReason: failedStatus ? transfer.status : null,
            },
          });
          if (failedStatus) failed++;
          else paid++;
        } catch (err) {
          failed++;
          await prisma.payout.update({
            where: { id: p.id },
            data: {
              status: "FAILED",
              failReason: err instanceof Error ? err.message.slice(0, 240) : "erro",
            },
          });
        }
      }

      const remaining = await prisma.payout.count({
        where: { gameId, status: { in: ["PENDING", "FAILED", "PROCESSING"] } },
      });
      await prisma.game.update({
        where: { id: gameId },
        data: { payoutStatus: remaining === 0 ? "PAID" : "APPROVED" },
      });
      await prisma.auditLog
        .create({
          data: {
            action: "payout_executed",
            actor: "admin",
            detail: `jogo ${gameId} · pagos ${paid} · falhas ${failed}`,
          },
        })
        .catch(() => {});
      return NextResponse.json({ ok: true, paid, failed });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro." },
      { status: 500 }
    );
  }
}
