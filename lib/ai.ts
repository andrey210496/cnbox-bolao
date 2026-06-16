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

export type ChatTurn = { role: "user" | "assistant"; content: string };

const CHAT_SYSTEM = (ctx: string) =>
  `Você é o "Especialista CNBOX", um analista de futebol que conversa com o apostador para ajudá-lo a fechar o palpite de placar de UM jogo específico.

Jogo em questão:
${ctx}

Regras:
- Responda em português do Brasil, tom de comentarista esportivo: confiante, direto e simpático.
- Seja CONCISO: respostas curtas (no máximo ~120 palavras), em conversa. Nada de textão.
- Foque NESTE jogo e em palpites de placar. Se perguntarem algo fora de futebol/aposta, redirecione gentilmente.
- Pode sugerir placares, analisar forças/fraquezas, tendências e dar uma recomendação cravada quando pedirem.
- Você NÃO tem dados ao vivo (escalações/lesões de hoje) salvo se forem informados; não invente fatos específicos.
- É opinião para entretenimento e não garante acerto. Não precisa repetir isso em toda resposta, só quando fizer sentido.`;

/** Conversa do chat do Especialista sobre um jogo. Retorna a resposta do agente. */
export async function chatWithSpecialist(params: {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  stage?: string | null;
  kickoffAt: Date;
  notes?: string | null;
  messages: ChatTurn[];
}): Promise<string> {
  const c = getClient();
  const when = new Date(params.kickoffAt).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
  const ctx = [
    `${params.homeTeam} x ${params.awayTeam}`,
    `${params.competition}${params.stage ? " — " + params.stage : ""}`,
    `Data/hora: ${when}`,
    params.notes ? `Contexto: ${params.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // mantém só os últimos turnos para não estourar contexto/custo
  const history = params.messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 2000),
  }));

  const resp = await c.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: CHAT_SYSTEM(ctx),
    messages: history,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || "Não consegui responder agora. Tente de novo.";
}
