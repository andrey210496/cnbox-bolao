import { prisma } from "./prisma";
import { getEconomics } from "./economics";
import { createCustomer, createCheckoutPayment } from "./asaas";

/**
 * Cria (ou reaproveita) a cobrança de ativação da unidade. Retorna o id do pedido.
 * Lança erro se a unidade já estiver ativa ou sem CPF do responsável.
 */
export async function createActivationOrder(unitId: string): Promise<string> {
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { name: true, holderName: true, holderCpf: true, active: true },
  });
  if (!unit) throw new Error("Unidade não encontrada.");
  if (unit.active) throw new Error("Esta unidade já está ativa.");
  if (!unit.holderCpf) throw new Error("CPF do responsável ausente.");

  // reaproveita pedido pendente com cobrança válida
  const pending = await prisma.unitOrder.findFirst({
    where: { unitId, status: "PENDING", checkoutUrl: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (pending) return pending.id;

  const eco = await getEconomics();
  const amount = eco.unit_activation_price ?? 49.9;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";

  const customer = await createCustomer({
    name: unit.holderName || unit.name,
    cpfCnpj: unit.holderCpf,
    externalReference: `unit:${unitId}`,
  });

  const order = await prisma.unitOrder.create({
    data: { unitId, amount, status: "PENDING", asaasCustomerId: customer.id },
    select: { id: true },
  });

  try {
    const payment = await createCheckoutPayment({
      customer: customer.id,
      value: amount,
      description: `Ativação da unidade — ${unit.name}`,
      externalReference: order.id,
      successUrl: `${site}/parceiro/ativar/${order.id}`,
    });
    await prisma.unitOrder.update({
      where: { id: order.id },
      data: { asaasPaymentId: payment.id, checkoutUrl: payment.invoiceUrl },
    });
  } catch (err) {
    await prisma.unitOrder.delete({ where: { id: order.id } }).catch(() => {});
    throw err;
  }

  return order.id;
}
