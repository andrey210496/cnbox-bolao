import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import EntriesTable, { type EntryRow } from "@/components/admin/EntriesTable";

export const dynamic = "force-dynamic";
const VALID = ["PENDING", "CONFIRMED", "EXPIRED"];

export default async function EntradasPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const sp = await searchParams;
  const filter = sp?.status && VALID.includes(sp.status) ? sp.status : "all";
  const where = filter === "all" ? {} : { status: filter };

  const [rows, counts, confirmedAgg] = await Promise.all([
    prisma.entry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 400,
      include: { user: { select: { fullName: true, phone: true } }, unit: { select: { name: true } } },
    }),
    prisma.entry.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.entry.aggregate({ where: { status: "CONFIRMED" }, _sum: { amount: true } }),
  ]);

  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((s, c) => s + c._count._all, 0);

  const entries: EntryRow[] = rows.map((b) => ({
    id: b.id,
    userName: b.user?.fullName ?? "—",
    userPhone: b.user?.phone ?? "",
    unitName: b.unit?.name ?? null,
    amount: b.amount,
    status: b.status,
    billingType: b.billingType,
    createdAt: b.createdAt.toISOString(),
  }));

  return (
    <div className="w-full">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-8 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl">EN<span className="text-brand">TRADAS</span></h1>
          <p className="text-white/50 text-sm mt-1">Quem entrou no bolão, quem pagou e quem ainda não pagou.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Total" value={String(total)} />
          <Stat label="Pagas" value={String(countMap.CONFIRMED ?? 0)} accent />
          <Stat label="Não pagas" value={String(countMap.PENDING ?? 0)} amber />
          <Stat label="Arrecadado (pago)" value={formatBRL(confirmedAgg._sum.amount ?? 0)} accent />
        </div>

        <section className="card-premium rounded-3xl p-5 sm:p-6">
          <EntriesTable entries={entries} filter={filter} />
        </section>
        <p className="text-center text-xs text-white/30">Mostrando as 400 entradas mais recentes do filtro.</p>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, amber }: { label: string; value: string; accent?: boolean; amber?: boolean }) {
  return (
    <div className="card-premium rounded-2xl p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`font-display text-2xl mt-1 tabular-nums ${amber ? "text-amber-300" : accent ? "text-brand text-glow" : "text-white"}`}>{value}</p>
    </div>
  );
}
