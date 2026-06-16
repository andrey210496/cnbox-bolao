// Limitador de taxa simples em memória (por instância). Suficiente para 1 container.
// Para múltiplos containers, trocar por Redis.

type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

/**
 * Retorna true se PERMITIDO, false se excedeu o limite.
 * @param key identificador (ex: `login:${ip}`)
 * @param limit nº de tentativas
 * @param windowMs janela em ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now > b.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

/** Extrai o IP do cliente a partir dos headers de proxy. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Limpeza periódica para não crescer indefinidamente
let lastSweep = Date.now();
export function maybeSweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of store) if (now > v.reset) store.delete(k);
}
