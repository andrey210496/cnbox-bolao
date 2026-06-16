import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function POST(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const name = String(b?.name ?? "").trim();
  if (name.length < 2)
    return NextResponse.json({ error: "Nome da unidade inválido." }, { status: 400 });

  let slug = slugify(String(b?.slug ?? "") || name);
  if (!slug) slug = "unidade";

  // Garante unicidade do slug
  const base = slug;
  let i = 1;
  while (await prisma.unit.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }

  const unit = await prisma.unit.create({
    data: { name, slug },
    select: { id: true, slug: true },
  });
  return NextResponse.json({ ok: true, unit });
}

export async function PATCH(req: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = String(b?.id ?? "");
  if (!id) return NextResponse.json({ error: "ID ausente." }, { status: 400 });
  await prisma.unit.update({
    where: { id },
    data: { active: Boolean(b?.active) },
  });
  return NextResponse.json({ ok: true });
}
