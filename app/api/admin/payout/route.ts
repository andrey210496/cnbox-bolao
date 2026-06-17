import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { computeSeasonPayouts } from "@/lib/payouts";
import { createPixTransfer, getBalance, isTransferFailed } from "@/lib/asaas";
import { round2 } from "@/lib/format";

export async function GET() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const preview = await computeSeasonPayouts();
    const payouts = await prisma.payout.findMany({ orderBy: { createdAt: "asc" } });
    let balance = 0;
    try {
      balance = await getBalance();
    } catch {}
    return NextResponse.json({ ...preview, payouts, balance });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  try {
    if (action === "approve") {
      const { winners } = await computeSeasonPayouts();
      for (const w of winners) {
        await prisma.payout.upsert({
          where: { userId: w.userId },
          update: { amount: w.amount, pixKey: w.pixKey, unitId: w.unitId, points: w.points },
          create: {
            userId: w.userId,
            unitId: w.unitId,
            pixKey: w.pixKey,
            amount: w.amount,
            points: w.points,
            status: "PENDING",
          },
        });
      }
      await prisma.auditLog
        .create({
          data: {
            action: "season_payout_approved",
            actor: "admin",
            detail: `${winners.length} ganhadores`,
          },
        })
        .catch(() => {});
      return NextResponse.json({ ok: true, count: winners.length });
    }

    if (action === "pay") {
      const toPay = await prisma.payout.findMany({
        where: { status: { in: ["PENDING", "FAILED"] } },
      });
      if (toPay.length === 0) return NextResponse.json({ ok: true, paid: 0, failed: 0 });

      const total = round2(toPay.reduce((s, p) => s + p.amount, 0));
      let balance = 0;
      try {
        balance = await getBalance();
      } catch {}
      if (balance < total) {
        return NextResponse.json(
          { error: `Saldo insuficiente no Asaas. Necessário ${total}, disponível ${balance}.` },
          { status: 400 }
        );
      }

      // tipos de chave PIX dos ganhadores
      const users = await prisma.user.findMany({
        where: { id: { in: toPay.map((p) => p.userId) } },
        select: { id: true, pixKeyType: true },
      });
      const keyType = new Map(users.map((u) => [u.id, u.pixKeyType]));

      let paid = 0;
      let failed = 0;
      for (const p of toPay) {
        try {
          await prisma.payout.update({ where: { id: p.id }, data: { status: "PROCESSING" } });
          const transfer = await createPixTransfer({
            value: p.amount,
            pixKey: p.pixKey,
            pixKeyType: keyType.get(p.userId) ?? "CPF",
            description: "Prêmio Bolão CNBOX",
            externalReference: p.id,
          });
          const fail = isTransferFailed(transfer.status);
          await prisma.payout.update({
            where: { id: p.id },
            data: {
              status: fail ? "FAILED" : "SENT",
              asaasTransferId: transfer.id,
              sentAt: fail ? null : new Date(),
              failReason: fail ? transfer.status : null,
            },
          });
          fail ? failed++ : paid++;
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
      await prisma.auditLog
        .create({
          data: { action: "season_payout_paid", actor: "admin", detail: `pagos ${paid} · falhas ${failed}` },
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
