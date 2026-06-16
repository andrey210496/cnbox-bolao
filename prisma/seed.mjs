import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const settings = {
  bet_price: "10",
  house_percent: "20",
  unit_percent: "10",
  payout_deadline_hours: "24",
  specialist_price: "9.9",
};

const units = [
  { name: "CNBOX Matriz", slug: "matriz" },
  { name: "CNBOX Zona Sul", slug: "zona-sul" },
  { name: "CNBOX Centro", slug: "centro" },
];

async function main() {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  for (const u of units) {
    await prisma.unit.upsert({
      where: { slug: u.slug },
      update: {},
      create: u,
    });
  }
  console.log("Seed OK: configurações + unidades de exemplo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
