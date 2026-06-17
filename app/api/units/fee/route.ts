import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHolderUnitId } from "@/lib/auth";

const MIN_ENTRY = 50;

// PATCH: o holder define o valor da entrada da sua unidade (mín. R$50).
export async function PATCH(req: Request) {
  const unitId = await getHolderUnitId();
  if (!unitId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const fee = Number(b?.entryFee);
  if (!Number.isFinite(fee) || fee < MIN_ENTRY) {
    return NextResponse.json(
      { error: `A entrada mínima é de R$${MIN_ENTRY},00.` },
      { status: 400 }
    );
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: { entryFee: Math.round(fee * 100) / 100 },
  });
  return NextResponse.json({ ok: true });
}
