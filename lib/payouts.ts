import { prisma } from "./prisma";
import { round2 } from "./format";
import { getUnitPool, getUnitStandings } from "./ranking";

export type SeasonWinner = {
  userId: string;
  unitId: string;
  unitName: string;
  name: string;
  pixKey: string;
  pixKeyType: string;
  amount: number;
  points: number;
};

/**
 * Apuração final (fim da Copa): para cada unidade, o(s) líder(es) em pontos
 * levam o prêmio acumulado da unidade. Empate divide igual. Unidade sem
 * ninguém pontuando não paga (fica com a casa).
 */
export async function computeSeasonPayouts(): Promise<{
  winners: SeasonWinner[];
  totalPool: number;
}> {
  const units = await prisma.unit.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  const winners: SeasonWinner[] = [];
  let totalPool = 0;

  for (const u of units) {
    const pool = await getUnitPool(u.id);
    totalPool = round2(totalPool + pool);
    if (pool <= 0) continue;

    const standings = await getUnitStandings(u.id);
    if (standings.length === 0 || standings[0].points <= 0) continue;

    const top = standings[0].points;
    const leaders = standings.filter((s) => s.points === top);

    const n = leaders.length;
    const baseCents = Math.floor((pool * 100) / n);
    let remainder = Math.round(pool * 100) - baseCents * n;

    const users = await prisma.user.findMany({
      where: { id: { in: leaders.map((l) => l.userId) } },
      select: { id: true, pixKey: true, pixKeyType: true },
    });
    const pix = new Map(users.map((x) => [x.id, x]));

    for (const l of leaders) {
      let cents = baseCents;
      if (remainder > 0) {
        cents += 1;
        remainder -= 1;
      }
      const pu = pix.get(l.userId);
      winners.push({
        userId: l.userId,
        unitId: u.id,
        unitName: u.name,
        name: l.name,
        pixKey: pu?.pixKey ?? "",
        pixKeyType: pu?.pixKeyType ?? "CPF",
        amount: cents / 100,
        points: l.points,
      });
    }
  }

  return { winners, totalPool };
}
