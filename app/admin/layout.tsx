import { isAdmin } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sem login → renderiza a página crua (ela mostra o formulário de login)
  if (!(await isAdmin())) return <>{children}</>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
