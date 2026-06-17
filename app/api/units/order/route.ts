import { NextResponse } from "next/server";
import { getHolderUnitId } from "@/lib/auth";
import { createActivationOrder } from "@/lib/unit-activation";

// POST: (re)gera a cobrança de ativação da unidade do holder logado.
export async function POST() {
  const unitId = await getHolderUnitId();
  if (!unitId) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  try {
    const orderId = await createActivationOrder(unitId);
    return NextResponse.json({ id: orderId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro." },
      { status: 400 }
    );
  }
}
