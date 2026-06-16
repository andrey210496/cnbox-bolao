import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth";

// Exclui TODAS as unidades inativas. Antes, desvincula alunos e palpites
// (viram "sem unidade") para não violar referências nem perder palpites pagos.
export async function POST() {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const inactive = await prisma.unit.findMany({
    where: { active: false },
    select: { id: true, name: true },
  });
  if (inactive.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0, names: [] });
  }

  const ids = inactive.map((u) => u.id);

  await prisma.$transaction([
    prisma.user.updateMany({ where: { unitId: { in: ids } }, data: { unitId: null } }),
    prisma.bet.updateMany({ where: { unitId: { in: ids } }, data: { unitId: null } }),
    prisma.unit.deleteMany({ where: { id: { in: ids } } }),
  ]);

  await prisma.auditLog
    .create({
      data: {
        action: "units_cleanup_inactive",
        actor: "admin",
        detail: `excluídas ${inactive.length}: ${inactive.map((u) => u.name).join(", ")}`,
      },
    })
    .catch(() => {});

  return NextResponse.json({
    ok: true,
    deleted: inactive.length,
    names: inactive.map((u) => u.name),
  });
}
