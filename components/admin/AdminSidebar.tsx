"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const LINKS = [
  { href: "/admin", label: "Visão geral", icon: "📊", exact: true },
  { href: "/admin/financeiro", label: "Financeiro", icon: "💰", exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  function active(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="md:w-60 md:min-h-screen md:shrink-0 md:border-r border-b md:border-b-0 border-white/10 glass">
      <div className="flex md:flex-col md:h-full md:gap-1 items-center md:items-stretch px-3 md:px-4 py-3 md:py-6 gap-2">
        <div className="flex items-center gap-2 md:mb-6 md:px-2">
          <Logo height={26} />
          <span className="hidden md:inline text-[10px] uppercase tracking-[0.25em] text-white/40">
            Admin
          </span>
        </div>

        <nav className="flex md:flex-col gap-1 flex-1">
          {LINKS.map((l) => {
            const on = active(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  on
                    ? "bg-brand/15 border border-brand/30 text-brand"
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className="text-base">{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={logout}
          className="rounded-xl px-3 py-2.5 text-sm text-white/50 hover:text-white hover:bg-white/5 md:text-left"
        >
          ⎋ Sair
        </button>
      </div>
    </aside>
  );
}
