import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPixKey, isValidPhone, onlyDigits } from "@/lib/validation";
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

// Auto-cadastro do responsável (holder) por uma unidade. Público, liberado na hora.
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
    const pixRaw = String(b?.pixKey ?? "").trim();

    if (name.length < 2) return bad("Informe o nome da unidade.");
    if (holderName.length < 3) return bad("Informe o nome do responsável.");
    if (!isValidPhone(holderPhone)) return bad("WhatsApp inválido (DDD + número).");
    const pix = detectPixKey(pixRaw);
    if (!pix) return bad("Chave PIX inválida (CPF, e-mail, telefone ou aleatória).");

    // Já existe unidade com esse nome? Reaproveita o registro (atualiza dados do holder).
    const existing = await prisma.unit.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, slug: true, holderName: true },
    });

    if (existing) {
      // Se já tem responsável cadastrado, não deixa sobrescrever (evita sequestro de unidade).
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
          pixKey: pix.key,
          pixKeyType: pix.type,
          active: true,
        },
        select: { slug: true },
      });
      return ok(updated.slug, req);
    }

    // Gera slug único
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
        pixKey: pix.key,
        pixKeyType: pix.type,
        active: true,
      },
      select: { slug: true },
    });

    await prisma.auditLog
      .create({
        data: { action: "unit_self_register", actor: "holder", detail: `${name} (${slug})` },
      })
      .catch(() => {});

    return ok(unit.slug, req);
  } catch (err) {
    console.error("[unit register] erro:", err);
    return bad("Erro ao cadastrar a unidade. Tente novamente.", 500);
  }
}

function ok(slug: string, req: Request) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  return NextResponse.json({ ok: true, slug, link: `${base}/u/${slug}` });
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
