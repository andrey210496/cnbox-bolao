import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { consumeDica } from "@/lib/specialist";

// POST: consome UMA dica (uso único) e retorna o conteúdo.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { gameId } = await params;

  try {
    const content = await consumeDica(uid, gameId);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar a dica.";
    console.error("[specialist dica] erro:", message);
    const status = message.includes("disponível") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
