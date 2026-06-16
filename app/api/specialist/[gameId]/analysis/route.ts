import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { hasSpecialistAccess, getOrCreateAnalysis } from "@/lib/specialist";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { gameId } = await params;

  if (!(await hasSpecialistAccess(uid, gameId))) {
    return NextResponse.json(
      { error: "Você precisa contratar o Especialista para este jogo." },
      { status: 403 }
    );
  }

  try {
    const content = await getOrCreateAnalysis(gameId);
    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar a análise.";
    console.error("[specialist analysis] erro:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
