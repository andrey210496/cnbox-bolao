import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createUserSession, hashPassword } from "@/lib/auth";
import {
  detectPixKey,
  isValidCPF,
  isValidFullName,
  isValidPhone,
  isStrongPassword,
  onlyDigits,
} from "@/lib/validation";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

export async function POST(req: Request) {
  maybeSweep();
  if (!rateLimit(`register:${clientIp(req)}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName ?? "").trim();
    const phone = onlyDigits(String(body?.phone ?? ""));
    const cpf = onlyDigits(String(body?.cpf ?? ""));
    const pixRaw = String(body?.pixKey ?? "").trim();
    const password = String(body?.password ?? "");
    const unitId = String(body?.unitId ?? "").trim();

    // Validações
    if (!isValidFullName(fullName))
      return bad("Informe seu nome completo.");
    if (!isValidPhone(phone))
      return bad("Telefone inválido (DDD + número).");
    if (!isValidCPF(cpf)) return bad("CPF inválido.");
    const pix = detectPixKey(pixRaw);
    if (!pix) return bad("Chave PIX inválida (CPF, e-mail, telefone ou aleatória).");
    if (!isStrongPassword(password))
      return bad("A senha deve ter ao menos 6 caracteres.");
    if (!unitId) return bad("Selecione a unidade onde você treina.");

    // Unidade escolhida na lista — precisa existir e estar ativa.
    const unit = await prisma.unit.findFirst({
      where: { id: unitId, active: true },
      select: { id: true },
    });
    if (!unit) return bad("Unidade inválida. Selecione uma da lista.");

    // CPF já cadastrado?
    const existing = await prisma.user.findUnique({ where: { cpf } });
    if (existing)
      return bad("Este CPF já tem cadastro. Faça login.", 409);

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        cpf,
        pixKey: pix.key,
        pixKeyType: pix.type,
        passwordHash,
        unitId: unit.id,
      },
      select: { id: true },
    });

    await createUserSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[register] erro:", err);
    return bad("Erro ao cadastrar. Tente novamente.", 500);
  }
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
