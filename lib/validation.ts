// Validações e formatações (CPF, telefone, chave PIX)

export function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

// ---------- CPF ----------
export function formatCPF(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i], 10) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === parseInt(cpf[9], 10) && check(10) === parseInt(cpf[10], 10);
}

// ---------- Telefone (BR) ----------
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function isValidPhone(value: string): boolean {
  const d = onlyDigits(value);
  return d.length === 10 || d.length === 11;
}

// ---------- Chave PIX ----------
export type PixKeyType = "CPF" | "EMAIL" | "PHONE" | "EVP";

/** Detecta e valida o tipo da chave PIX. Retorna null se inválida. */
export function detectPixKey(raw: string): { type: PixKeyType; key: string } | null {
  const value = (raw || "").trim();
  if (!value) return null;

  // E-mail
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { type: "EMAIL", key: value.toLowerCase() };
  }
  // Chave aleatória (EVP) — UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return { type: "EVP", key: value.toLowerCase() };
  }

  const digits = onlyDigits(value);
  // CPF (11 dígitos válidos)
  if (digits.length === 11 && isValidCPF(digits)) {
    return { type: "CPF", key: digits };
  }
  // Telefone (10 ou 11 dígitos) -> formato E.164 +55
  if (digits.length === 10 || digits.length === 11) {
    return { type: "PHONE", key: "+55" + digits };
  }
  return null;
}

export function isValidPixKey(raw: string): boolean {
  return detectPixKey(raw) !== null;
}

// ---------- Senha ----------
export function isStrongPassword(pw: string): boolean {
  // mínimo razoável: 6+ caracteres
  return typeof pw === "string" && pw.length >= 6;
}

// ---------- Nome ----------
export function isValidFullName(name: string): boolean {
  const n = (name || "").trim();
  return n.length >= 5 && n.includes(" ");
}
