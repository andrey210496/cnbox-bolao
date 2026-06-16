// Integração com a API do Asaas — cobranças PIX
// Docs: https://docs.asaas.com/docs/cobrancas-via-pix

const ENV = process.env.ASAAS_ENV ?? "production";
const BASE_URL =
  ENV === "sandbox"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/v3";

const API_KEY = process.env.ASAAS_API_KEY ?? "";

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    access_token: API_KEY,
    "User-Agent": "CNBOX-Bolao",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      "ASAAS_API_KEY não configurada. Preencha a chave de produção no arquivo .env"
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: headers(),
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const errors = (data as { errors?: { description?: string }[] })?.errors;
    const message =
      errors?.map((e) => e.description).join("; ") ||
      `Erro Asaas (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export interface AsaasCustomer {
  id: string;
  name: string;
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  invoiceUrl?: string;
}

export interface AsaasPixQrCode {
  encodedImage: string; // base64 (sem o prefixo data:)
  payload: string; // copia e cola
  expirationDate: string;
}

export async function createCustomer(params: {
  name: string;
  cpfCnpj: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  return request<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      cpfCnpj: params.cpfCnpj,
      externalReference: params.externalReference,
      notificationDisabled: true,
    }),
  });
}

export async function createPixPayment(params: {
  customer: string;
  value: number;
  description: string;
  externalReference?: string;
}): Promise<AsaasPayment> {
  // Vencimento: amanhã (PIX dinâmico com vencimento)
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().slice(0, 10); // YYYY-MM-DD

  return request<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customer,
      billingType: "PIX",
      value: params.value,
      dueDate,
      description: params.description,
      externalReference: params.externalReference,
    }),
  });
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return request<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

/**
 * Cria uma cobrança "aberta" (billingType UNDEFINED): a fatura do Asaas (invoiceUrl)
 * deixa o cliente escolher PIX, cartão de débito ou crédito.
 * Crédito à vista e a exclusão de boleto são definidos nas configurações da conta Asaas.
 */
export async function createCheckoutPayment(params: {
  customer: string;
  value: number;
  description: string;
  externalReference?: string;
  successUrl?: string;
}): Promise<AsaasPayment> {
  const due = new Date();
  due.setDate(due.getDate() + 1);
  const dueDate = due.toISOString().slice(0, 10);

  return request<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: params.customer,
      billingType: "UNDEFINED", // PIX + cartão (crédito e débito) na fatura
      value: params.value,
      dueDate,
      description: params.description,
      externalReference: params.externalReference,
      ...(params.successUrl
        ? { callback: { successUrl: params.successUrl, autoRedirect: true } }
        : {}),
    }),
  });
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return request<AsaasPayment>(`/payments/${paymentId}`);
}

// Status que indicam pagamento efetivado
export function isPaidStatus(status: string): boolean {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);
}

// ---------- Transferências PIX (pagamento dos ganhadores) ----------
export interface AsaasTransfer {
  id: string;
  status: string; // PENDING | BANK_PROCESSING | DONE | FAILED | CANCELLED
  value: number;
}

// Mapeia o tipo interno de chave PIX para o aceito pelo Asaas
function mapPixKeyType(t: string): string {
  switch (t) {
    case "EVP":
      return "RANDOM_KEY";
    case "CPF":
    case "CNPJ":
    case "EMAIL":
    case "PHONE":
      return t;
    default:
      return "CPF";
  }
}

export async function createPixTransfer(params: {
  value: number;
  pixKey: string;
  pixKeyType: string; // CPF | EMAIL | PHONE | EVP
  description: string;
  externalReference: string;
}): Promise<AsaasTransfer> {
  return request<AsaasTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      value: params.value,
      operationType: "PIX",
      pixAddressKey: params.pixKey,
      pixAddressKeyType: mapPixKeyType(params.pixKeyType),
      description: params.description,
      externalReference: params.externalReference,
    }),
  });
}

// Saldo disponível na conta Asaas (para conferir antes de pagar)
export async function getBalance(): Promise<number> {
  const r = await request<{ balance: number }>("/finance/balance");
  return r.balance ?? 0;
}

// ---------- Estatísticas financeiras (dashboard) ----------
export interface AsaasStatistics {
  quantity: number; // nº de cobranças
  value: number; // soma do valor bruto
  netValue: number; // soma do valor líquido (já descontada a tarifa do Asaas)
}

/** Totais de cobranças por status/método. tarifa = value - netValue. */
export async function getPaymentStatistics(params: {
  status?: string; // PENDING | CONFIRMED | RECEIVED | OVERDUE
  billingType?: string; // PIX | CREDIT_CARD | DEBIT_CARD | BOLETO
}): Promise<AsaasStatistics> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.billingType) q.set("billingType", params.billingType);
  const qs = q.toString();
  const r = await request<Partial<AsaasStatistics>>(
    `/finance/payment/statistics${qs ? `?${qs}` : ""}`
  );
  return {
    quantity: r.quantity ?? 0,
    value: r.value ?? 0,
    netValue: r.netValue ?? 0,
  };
}

export interface AsaasPaymentItem {
  id: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  paymentDate?: string | null;
  estimatedCreditDate?: string | null;
  creditDate?: string | null;
}

/** Lista cobranças (paginada). Usado para os prazos de liberação. */
export async function listPayments(params: {
  status?: string;
  billingType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: AsaasPaymentItem[]; hasMore: boolean; totalCount: number }> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.billingType) q.set("billingType", params.billingType);
  q.set("limit", String(params.limit ?? 100));
  q.set("offset", String(params.offset ?? 0));
  return request(`/payments?${q.toString()}`);
}

export function isTransferFailed(status: string): boolean {
  return ["FAILED", "CANCELLED"].includes(status);
}

export { ENV as ASAAS_ENV };
