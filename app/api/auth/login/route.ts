import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSession, verifyPassword } from "@/lib/auth";
import { isValidCPF, onlyDigits } from "@/lib/validation";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

export async function POST(req: Request) {
  maybeSweep();
  if (!rateLimit(`login:${clientIp(req)}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const cpf = onlyDigits(String(body?.cpf ?? ""));
    const password = String(body?.password ?? "");

    if (!isValidCPF(cpf) || !password) {
      return NextResponse.json({ error: "CPF ou senha inválidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { cpf },
      select: { id: true, passwordHash: true },
    });

    // Mensagem genérica (não revela se o CPF existe)
    const fail = NextResponse.json(
      { error: "CPF ou senha incorretos." },
      { status: 401 }
    );
    if (!user) return fail;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return fail;

    await createUserSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[login] erro:", err);
    return NextResponse.json({ error: "Erro ao entrar." }, { status: 500 });
  }
}
