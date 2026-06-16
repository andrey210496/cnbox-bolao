import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";
import { DEFAULTS } from "@/lib/economics";

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const keys = Object.keys(DEFAULTS) as (keyof typeof DEFAULTS)[];

  // Casa + unidade não pode passar de 100% (senão o prêmio fica negativo)
  const house = b.house_percent !== undefined ? Number(b.house_percent) : DEFAULTS.house_percent;
  const unit = b.unit_percent !== undefined ? Number(b.unit_percent) : DEFAULTS.unit_percent;
  if (!Number.isNaN(house) && !Number.isNaN(unit) && house + unit > 100) {
    return NextResponse.json(
      { error: "Casa + unidade não pode passar de 100%." },
      { status: 400 }
    );
  }

  for (const k of keys) {
    if (b[k] === undefined || b[k] === null || b[k] === "") continue;
    const n = Number(b[k]);
    if (Number.isNaN(n) || n < 0) {
      return NextResponse.json({ error: `Valor inválido para ${k}.` }, { status: 400 });
    }
    if (k === "house_percent" && n > 100) {
      return NextResponse.json({ error: "A % da casa não pode passar de 100." }, { status: 400 });
    }
    await prisma.setting.upsert({
      where: { key: k },
      update: { value: String(n) },
      create: { key: k, value: String(n) },
    });
  }

  await prisma.auditLog
    .create({ data: { action: "settings_update", actor: "admin" } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
