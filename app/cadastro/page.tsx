import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Logo from "@/components/Logo";
import RegisterForm from "@/components/RegisterForm";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CadastroPage() {
  if (await getUserId()) redirect("/app");

  // Indicação por unidade (cookie definido em /u/[slug]) — pré-preenche o nome
  const slug = (await cookies()).get("cnbox_unit")?.value;
  let presetUnitName: string | undefined;
  if (slug) {
    const u = await prisma.unit
      .findFirst({ where: { slug, active: true }, select: { name: true } })
      .catch(() => null);
    presetUnitName = u?.name ?? undefined;
  }

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/">
            <Logo height={44} />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl mt-5">
            CRIE SUA <span className="text-brand text-glow">CONTA</span>
          </h1>
          <p className="text-white/55 mt-2 text-sm">
            Cadastre-se uma vez e palpite em todos os jogos da Copa.
          </p>
        </div>

        <RegisterForm presetUnitName={presetUnitName} />
      </div>
    </main>
  );
}
