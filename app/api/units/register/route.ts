import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHolderSession, hashPassword } from "@/lib/auth";
import {
  detectPixKey,
  isStrongPassword,
  isValidCPF,
  isValidPhone,
  onlyDigits,
} from "@/lib/validation";
import { createActivationOrder } from "@/lib/unit-activation";
import { rateLimit, clientIp, maybeSweep } from "@/lib/ratelimit";

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "unidade"
  );
}

// Auto-cadastro do responsável (holder). A unidade fica INATIVA até pagar a ativação.
export async function POST(req: Request) {
  maybeSweep();
  if (!rateLimit(`unit:${clientIp(req)}`, 6, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 }
    );
  }

  try {
    const b = await req.json().catch(() => ({}));
    const name = String(b?.name ?? "").trim();
    const holderName = String(b?.holderName ?? "").trim();
    const holderPhone = onlyDigits(String(b?.holderPhone ?? ""));
    const holderCpf = onlyDigits(String(b?.holderCpf ?? ""));
    const pixRaw = String(b?.pixKey ?? "").trim();
    const password = String(b?.password ?? "");

    if (name.length < 2) return bad("Informe o nome da unidade.");
    if (holderName.length < 3) return bad("Informe o nome do responsável.");
    if (!isValidPhone(holderPhone)) return bad("WhatsApp inválido (DDD + número).");
    if (!isValidCPF(holderCpf)) return bad("CPF do responsável inválido.");
    const pix = detectPixKey(pixRaw);
    if (!pix) return bad("Chave PIX inválida (CPF, e-mail, telefone ou aleatória).");
    if (!isStrongPassword(password))
      return bad("A senha deve ter ao menos 6 caracteres.");

    // WhatsApp é o login do holder — não pode repetir entre responsáveis.
    const phoneTaken = await prisma.unit.findFirst({
      where: { holderPhone, passwordHash: { not: null } },
      select: { id: true },
    });
    if (phoneTaken)
      return bad("Este WhatsApp já tem uma unidade cadastrada. Faça login.", 409);

    const passwordHash = await hashPassword(password);

    // Já existe unidade com esse nome sem responsável? Reaproveita.
    const existing = await prisma.unit.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, slug: true, holderName: true },
    });

    let unitId: string;
    if (existing) {
      if (existing.holderName) {
        return bad(
          "Já existe uma unidade com esse nome e responsável. Use outro nome ou fale com a CNBOX.",
          409
        );
      }
      const updated = await prisma.unit.update({
        where: { id: existing.id },
        data: {
          holderName,
          holderPhone,
          holderCpf,
          pixKey: pix.key,
          pixKeyType: pix.type,
          passwordHash,
          active: false, // só ativa após pagar a ativação
        },
        select: { id: true },
      });
      unitId = updated.id;
    } else {
      let slug = slugify(name);
      const base = slug;
      let i = 1;
      while (await prisma.unit.findUnique({ where: { slug } })) slug = `${base}-${i++}`;
      const unit = await prisma.unit.create({
        data: {
          name,
          slug,
          holderName,
          holderPhone,
          holderCpf,
          pixKey: pix.key,
          pixKeyType: pix.type,
          passwordHash,
          active: false,
        },
        select: { id: true },
      });
      unitId = unit.id;
      await prisma.auditLog
        .create({ data: { action: "unit_self_register", actor: "holder", detail: `${name}` } })
        .catch(() => {});
    }

    await createHolderSession(unitId);

    // Gera a cobrança de ativação
    const orderId = await createActivationOrder(unitId);
    return NextResponse.json({ ok: true, orderId });
  } catch (err) {
    console.error("[unit register] erro:", err);
    return bad("Erro ao cadastrar a unidade. Tente novamente.", 500);
  }
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
