import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminCredentials } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = String(body?.user ?? "");
  const password = String(body?.password ?? "");

  if (!verifyAdminCredentials(user, password)) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  await createAdminSession();
  await prisma.auditLog
    .create({ data: { action: "admin_login", actor: "admin" } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
