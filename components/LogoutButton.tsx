"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({
  endpoint = "/api/auth/logout",
}: {
  endpoint?: string;
}) {
  const router = useRouter();
  async function logout() {
    await fetch(endpoint, { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="text-sm text-white/50 hover:text-white px-3 py-2 rounded-lg glass transition"
    >
      Sair
    </button>
  );
}
