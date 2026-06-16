import { prisma } from "./prisma";
import { getUserId } from "./auth";

export type CurrentUser = {
  id: string;
  fullName: string;
  cpf: string;
  phone: string;
  pixKey: string;
  pixKeyType: string;
  unitId: string | null;
  unitName: string | null;
};

/** Retorna o usuário logado (ou null). Para uso em Server Components. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const uid = await getUserId();
  if (!uid) return null;
  try {
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        fullName: true,
        cpf: true,
        phone: true,
        pixKey: true,
        pixKeyType: true,
        unitId: true,
        unit: { select: { name: true } },
      },
    });
    if (!u) return null;
    return {
      id: u.id,
      fullName: u.fullName,
      cpf: u.cpf,
      phone: u.phone,
      pixKey: u.pixKey,
      pixKeyType: u.pixKeyType,
      unitId: u.unitId,
      unitName: u.unit?.name ?? null,
    };
  } catch {
    return null;
  }
}
