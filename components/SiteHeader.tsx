import Link from "next/link";
import Logo from "./Logo";
import PromoBar from "./PromoBar";
import { getUserId } from "@/lib/auth";

export default async function SiteHeader() {
  const logged = Boolean(await getUserId());
  return (
    <div className="sticky top-0 z-50">
      <PromoBar />
      <header className="w-full glass border-b border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo height={32} />
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.3em] text-brand/70 group-hover:text-brand transition-colors">
              Bolão
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            {logged ? (
              <Link
                href="/app"
                className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm"
              >
                Minha conta
              </Link>
            ) : (
              <>
                <Link
                  href="/entrar"
                  className="px-3 sm:px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm"
                >
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
    </div>
  );
}
