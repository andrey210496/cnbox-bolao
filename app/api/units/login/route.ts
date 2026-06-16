import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHolderSession, verifyPassword } from "@/lib/auth";
import { onlyDigits } from "@/lib/validation";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

// Login do holder: WhatsApp + senha.
export async function POST(req: Request) {
  maybeSweep();
  if (!rateLimit(`unitlogin:${clientIp(req)}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  const b = await req.json().catch(() => ({}));
  const phone = onlyDigits(String(b?.phone ?? ""));
  const password = String(b?.password ?? "");

  const fail = () =>
    NextResponse.json({ error: "WhatsApp ou senha incorretos." }, { status: 401 });

  if (!phone || !password) return fail();

  const unit = await prisma.unit.findFirst({
    where: { holderPhone: phone, passwordHash: { not: null } },
    select: { id: true, passwordHash: true },
  });
  if (!unit?.passwordHash) return fail();

  const okPw = await verifyPassword(password, unit.passwordHash);
  if (!okPw) return fail();

  await createHolderSession(unit.id);
  return NextResponse.json({ ok: true });
}
