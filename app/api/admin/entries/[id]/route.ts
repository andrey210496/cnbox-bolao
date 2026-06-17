import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { getPayment, isPaidStatus, paymentSnapshot } from "@/lib/asaas";

// Ações do admin sobre uma entrada: recheck | confirm | expire
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? "");

  const entry = await prisma.entry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 });

  try {
    if (action === "recheck") {
      if (!entry.asaasPaymentId) return NextResponse.json({ error: "Sem cobrança." }, { status: 400 });
      const p = await getPayment(entry.asaasPaymentId);
      if (isPaidStatus(p.status) && entry.status !== "CONFIRMED") {
        await prisma.entry.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date(), ...paymentSnapshot(p) } });
        return NextResponse.json({ ok: true, status: "CONFIRMED" });
      }
      return NextResponse.json({ ok: true, status: entry.status, asaas: p.status });
    }
    if (action === "confirm") {
      let snap = {};
      if (entry.asaasPaymentId) {
        try { snap = paymentSnapshot(await getPayment(entry.asaasPaymentId)); } catch {}
      }
      await prisma.entry.update({ where: { id }, data: { status: "CONFIRMED", confirmedAt: new Date(), ...snap } });
      return NextResponse.json({ ok: true, status: "CONFIRMED" });
    }
    if (action === "expire") {
      await prisma.entry.update({ where: { id }, data: { status: "EXPIRED" } });
      return NextResponse.json({ ok: true, status: "EXPIRED" });
    }
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { id } = await params;
  await prisma.entry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
