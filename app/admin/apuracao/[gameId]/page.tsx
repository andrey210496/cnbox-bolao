import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import Apuracao from "@/components/admin/Apuracao";

export const dynamic = "force-dynamic";

export default async function ApuracaoPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin");
  const { gameId } = await params;
  return <Apuracao gameId={gameId} />;
}
