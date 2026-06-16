import Anthropic from "@anthropic-ai/sdk";

// Modelo configurável. Padrão: Opus 4.8. Para mais velocidade/custo menor em
// alto volume, troque ANTHROPIC_MODEL por "claude-sonnet-4-6" ou "claude-haiku-4-5".
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  }
  if (!client) client = new Anthropic();
  return client;
}

const SYSTEM = `Você é o "Especialista CNBOX", um analista esportivo de futebol que ajuda apostadores a montar seus palpites de placar.

Regras:
- Escreva em português do Brasil, tom confiante e direto, como um comentarista esportivo.
- Estruture a resposta em seções curtas com estes títulos exatos, em maiúsculas:
  PANORAMA DO JOGO
  PONTOS-CHAVE
  PLACARES MAIS PROVÁVEIS
  O PALPITE DO ESPECIALISTA
- Em "PLACARES MAIS PROVÁVEIS", liste 3 placares com uma linha de justificativa cada.
- Em "O PALPITE DO ESPECIALISTA", crave UM placar recomendado e explique em 1-2 frases.
- Seja objetivo (no máximo ~250 palavras no total). Sem rodeios, sem listas gigantes.
- IMPORTANTE: deixe claro, na última linha, que é uma análise de opinião para entretenimento e NÃO garante acerto.
- Você não tem dados ao vivo (escalações/lesões de hoje) a menos que sejam fornecidos no contexto; baseie-se em conhecimento geral e raciocínio, sem inventar fatos específicos como "o jogador X está lesionado" se isso não foi informado.`;

/** Gera a análise do jogo. Retorna o texto. */
export async function generateGameAnalysis(params: {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  stage?: string | null;
  kickoffAt: Date;
  notes?: string | null;
}): Promise<{ content: string; model: string }> {
  const c = getClient();
  const when = new Date(params.kickoffAt).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  const userMsg = [
    `Jogo: ${params.homeTeam} x ${params.awayTeam}`,
    `Competição: ${params.competition}${params.stage ? " — " + params.stage : ""}`,
    `Data/hora: ${when}`,
    params.notes ? `Contexto fornecido pela organização: ${params.notes}` : "",
    ``,
    `Faça a análise do jogo e recomende os palpites de placar.`,
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { content: text || "Não foi possível gerar a análise agora.", model: MODEL };
}
