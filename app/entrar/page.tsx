import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LoginForm from "@/components/LoginForm";
import { getUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  if (await getUserId()) redirect("/app");

  return (
    <main className="flex-1 w-full flex items-center justify-center">
      <div className="w-full max-w-md px-4 sm:px-6 py-10">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/">
            <Logo height={44} />
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl mt-5">
            <span className="text-brand text-glow">ENTRAR</span>
          </h1>
          <p className="text-white/55 mt-2 text-sm">
            Acesse sua conta para palpitar.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
