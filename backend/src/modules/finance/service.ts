import { PaymentMethod, TransactionType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

async function getFeePctForMethod(paymentMethod: PaymentMethod, date: Date): Promise<number> {
  if (paymentMethod !== 'MP_QR' && paymentMethod !== 'MP_POINT') return 0;

  const fee = await prisma.paymentMethodFee.findFirst({
    where: { paymentMethod, effectiveFrom: { lte: date } },
    orderBy: { effectiveFrom: 'desc' },
  });

  return fee ? Number(fee.feePct) : 0;
}

export async function listPaymentMethodFees() {
  return prisma.paymentMethodFee.findMany({ orderBy: [{ paymentMethod: 'asc' }, { effectiveFrom: 'desc' }] });
}

export async function setPaymentMethodFee(input: { paymentMethod: PaymentMethod; feePct: number; effectiveFrom: Date }) {
  if (input.paymentMethod !== 'MP_QR' && input.paymentMethod !== 'MP_POINT') {
    throw new AppError(400, 'La comision solo aplica a Mercado Pago QR o Point');
  }
  return prisma.paymentMethodFee.create({ data: input });
}

interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  concept: string;
  clientId?: string;
  tipAmount?: number;
  tipProfessionalId?: string;
  datetime: Date;
  createdByUserId: string;
  services?: { serviceId: string; professionalId: string }[];
}

export async function createTransaction(input: CreateTransactionInput) {
  const feePct = await getFeePctForMethod(input.paymentMethod, input.datetime);
  const netAmount = input.amount - input.amount * (feePct / 100);

  let serviceRows: { serviceId: string; professionalId: string; priceAtTransaction: number }[] = [];
  if (input.services && input.services.length > 0) {
    const serviceIds = input.services.map((s) => s.serviceId);
    const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
    if (services.length !== serviceIds.length) throw new AppError(400, 'Uno o mas servicios no existen');

    serviceRows = input.services.map((s) => ({
      serviceId: s.serviceId,
      professionalId: s.professionalId,
      priceAtTransaction: Number(services.find((sv) => sv.id === s.serviceId)!.price),
    }));
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        type: input.type,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        concept: input.concept,
        clientId: input.clientId,
        tipAmount: input.tipAmount ?? 0,
        tipProfessionalId: input.tipProfessionalId,
        netAmount,
        datetime: input.datetime,
        createdByUserId: input.createdByUserId,
      },
    });

    if (serviceRows.length > 0) {
      await tx.transactionService.createMany({
        data: serviceRows.map((s) => ({ transactionId: created.id, ...s })),
      });
    }

    return tx.transaction.findUniqueOrThrow({
      where: { id: created.id },
      include: { client: true, services: { include: { service: true, professional: true } } },
    });
  });
}

export async function listTransactions(filters: { from: Date; to: Date; type?: TransactionType; paymentMethod?: PaymentMethod }) {
  return prisma.transaction.findMany({
    where: {
      datetime: { gte: filters.from, lte: filters.to },
      type: filters.type,
      paymentMethod: filters.paymentMethod,
    },
    include: { client: true, services: { include: { service: true, professional: true } } },
    orderBy: { datetime: 'desc' },
  });
}

// Edicion acotada a corregir errores de tipeo (monto, propina, medio de pago,
// concepto) despues de cargar el movimiento. No se tocan los servicios: si
// hay que cambiar que servicios/profesional se cobraron, se borra y se carga
// de nuevo.
export async function updateTransaction(
  id: string,
  input: { amount?: number; tipAmount?: number; tipProfessionalId?: string | null; paymentMethod?: PaymentMethod; concept?: string },
) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Movimiento no encontrado');
  if (existing.cashRegisterId) throw new AppError(409, 'No se puede editar un movimiento de una caja ya cerrada');

  const amount = input.amount ?? Number(existing.amount);
  const paymentMethod = input.paymentMethod ?? existing.paymentMethod;
  const feePct = await getFeePctForMethod(paymentMethod, existing.datetime);
  const netAmount = amount - amount * (feePct / 100);

  return prisma.transaction.update({
    where: { id },
    data: {
      amount,
      paymentMethod,
      netAmount,
      concept: input.concept ?? undefined,
      tipAmount: input.tipAmount ?? undefined,
      tipProfessionalId: input.tipProfessionalId === undefined ? undefined : input.tipProfessionalId,
    },
    include: { client: true, services: { include: { service: true, professional: true } } },
  });
}

export async function deleteTransaction(id: string) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Movimiento no encontrado');
  if (existing.cashRegisterId) throw new AppError(409, 'No se puede borrar un movimiento de una caja ya cerrada');

  await prisma.$transaction([
    prisma.transactionService.deleteMany({ where: { transactionId: id } }),
    prisma.transaction.delete({ where: { id } }),
  ]);
}

function dayBounds(date: string) {
  return { from: new Date(`${date}T00:00:00.000Z`), to: new Date(`${date}T23:59:59.999Z`) };
}

export async function getCashRegisterSummary(date: string) {
  const { from, to } = dayBounds(date);

  const existing = await prisma.cashRegister.findUnique({ where: { date: from } });

  const transactions = await prisma.transaction.findMany({
    where: { datetime: { gte: from, lte: to } },
  });

  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);
  const openingBalance = existing ? Number(existing.openingBalance) : 0;

  return {
    date,
    openingBalance,
    totalIncome,
    totalExpense,
    balance: openingBalance + totalIncome - totalExpense,
    closed: !!existing?.closedAt,
    closedAt: existing?.closedAt ?? null,
    transactionCount: transactions.length,
  };
}

export async function openCashRegister(date: string, openingBalance: number) {
  const { from } = dayBounds(date);
  const existing = await prisma.cashRegister.findUnique({ where: { date: from } });
  if (existing) throw new AppError(409, 'La caja de ese dia ya fue abierta');

  return prisma.cashRegister.create({ data: { date: from, openingBalance } });
}

export async function closeCashRegister(date: string, closedByUserId: string) {
  const { from, to } = dayBounds(date);

  let register = await prisma.cashRegister.findUnique({ where: { date: from } });
  if (!register) {
    register = await prisma.cashRegister.create({ data: { date: from, openingBalance: 0 } });
  }
  if (register.closedAt) throw new AppError(409, 'La caja de ese dia ya esta cerrada');

  const transactions = await prisma.transaction.findMany({ where: { datetime: { gte: from, lte: to } } });
  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);
  const openingBalance = Number(register.openingBalance);

  return prisma.$transaction(async (tx) => {
    await tx.transaction.updateMany({
      where: { datetime: { gte: from, lte: to } },
      data: { cashRegisterId: register!.id },
    });

    return tx.cashRegister.update({
      where: { id: register!.id },
      data: {
        totalIncome,
        totalExpense,
        closingBalance: openingBalance + totalIncome - totalExpense,
        closedAt: new Date(),
        closedByUserId,
      },
    });
  });
}

export async function listCashRegisterHistory(from: Date, to: Date) {
  return prisma.cashRegister.findMany({
    where: { date: { gte: from, lte: to } },
    orderBy: { date: 'desc' },
  });
}

// ---------- Comisiones variables por categoria ----------

export async function listCommissionRates(professionalId?: string) {
  return prisma.professionalCommissionRate.findMany({
    where: { professionalId },
    include: { category: true },
  });
}

export async function setCommissionRate(input: { professionalId: string; categoryId: string; commissionPct: number }) {
  const professional = await prisma.professional.findUnique({ where: { id: input.professionalId } });
  if (!professional) throw new AppError(404, 'Profesional no encontrada');
  const category = await prisma.serviceCategory.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new AppError(404, 'Categoria no encontrada');

  return prisma.professionalCommissionRate.upsert({
    where: { professionalId_categoryId: { professionalId: input.professionalId, categoryId: input.categoryId } },
    create: input,
    update: { commissionPct: input.commissionPct },
    include: { category: true },
  });
}

export async function deleteCommissionRate(professionalId: string, categoryId: string) {
  await prisma.professionalCommissionRate.deleteMany({ where: { professionalId, categoryId } });
}

interface CommissionCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  serviceAmount: number;
  commissionPct: number;
  commissionAmount: number;
  isOverride: boolean;
}

export async function getCommissionPreview(professionalId: string, from: Date, to: Date) {
  const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
  if (!professional) throw new AppError(404, 'Profesional no encontrada');

  const [items, rates] = await Promise.all([
    prisma.transactionService.findMany({
      where: {
        professionalId,
        transaction: { type: 'INCOME', datetime: { gte: from, lte: to } },
      },
      include: { service: { include: { category: true } }, transaction: true },
    }),
    prisma.professionalCommissionRate.findMany({ where: { professionalId } }),
  ]);

  const defaultPct = Number(professional.commissionPct);
  const rateByCategory = new Map(rates.map((r) => [r.categoryId, Number(r.commissionPct)]));

  const byCategory = new Map<string, { categoryName: string; serviceAmount: number }>();
  for (const item of items) {
    const catId = item.service.categoryId;
    const entry = byCategory.get(catId) ?? { categoryName: item.service.category.name, serviceAmount: 0 };
    entry.serviceAmount += Number(item.priceAtTransaction);
    byCategory.set(catId, entry);
  }

  const breakdown: CommissionCategoryBreakdown[] = Array.from(byCategory.entries()).map(([categoryId, v]) => {
    const isOverride = rateByCategory.has(categoryId);
    const commissionPct = isOverride ? rateByCategory.get(categoryId)! : defaultPct;
    return {
      categoryId,
      categoryName: v.categoryName,
      serviceAmount: v.serviceAmount,
      commissionPct,
      commissionAmount: v.serviceAmount * (commissionPct / 100),
      isOverride,
    };
  });

  const totalServiceAmount = breakdown.reduce((sum, b) => sum + b.serviceAmount, 0);
  const totalCommission = breakdown.reduce((sum, b) => sum + b.commissionAmount, 0);
  const commissionPct = totalServiceAmount > 0 ? (totalCommission / totalServiceAmount) * 100 : defaultPct;
  const totalTips = await getAttributedTips(professionalId, items, from, to);

  return {
    professionalId,
    professionalName: `${professional.firstName} ${professional.lastName}`,
    defaultCommissionPct: defaultPct,
    commissionPct,
    totalServiceAmount,
    totalCommission,
    totalTips,
    grandTotal: totalCommission + totalTips,
    breakdown,
    items,
  };
}

// La propina no lleva %: se cobra por el servicio, no por la venta. Hay dos
// formas de atribuirla a una profesional:
//  1) Prorrateada segun los servicios de la transaccion (caso normal: se
//     cobra junto con el turno). Si el cobro tiene un solo profesional, le
//     corresponde el 100%; si se reparte entre varias, se prorratea segun
//     cuanto hizo cada una ahi.
//  2) Asignada directamente via tipProfessionalId (propina suelta, cargada
//     aparte del cobro del servicio - ej. desde la pantalla de Comisiones).
//     En ese caso NO se prorratea: es 100% de esa profesional, y se ignora
//     el prorrateo por servicios para no contarla dos veces.
async function getAttributedTips(
  professionalId: string,
  items: { transactionId: string; priceAtTransaction: unknown; transaction: { tipAmount: unknown; tipProfessionalId: string | null } }[],
  from: Date,
  to: Date,
) {
  const transactionIds = new Set(
    items.filter((i) => !i.transaction.tipProfessionalId).map((i) => i.transactionId),
  );

  let totalTips = 0;

  if (transactionIds.size > 0) {
    const allLines = await prisma.transactionService.findMany({
      where: { transactionId: { in: Array.from(transactionIds) } },
      include: { transaction: { select: { tipAmount: true, tipProfessionalId: true } } },
    });

    const totalsByTransaction = new Map<string, number>();
    const ownTotalsByTransaction = new Map<string, number>();
    for (const line of allLines) {
      totalsByTransaction.set(line.transactionId, (totalsByTransaction.get(line.transactionId) ?? 0) + Number(line.priceAtTransaction));
      if (line.professionalId === professionalId) {
        ownTotalsByTransaction.set(line.transactionId, (ownTotalsByTransaction.get(line.transactionId) ?? 0) + Number(line.priceAtTransaction));
      }
    }

    for (const txId of transactionIds) {
      const tipAmount = Number(allLines.find((l) => l.transactionId === txId)?.transaction.tipAmount ?? 0);
      if (tipAmount === 0) continue;
      const txTotal = totalsByTransaction.get(txId) ?? 0;
      const ownTotal = ownTotalsByTransaction.get(txId) ?? 0;
      if (txTotal > 0) totalTips += tipAmount * (ownTotal / txTotal);
    }
  }

  const directTips = await prisma.transaction.findMany({
    where: { tipProfessionalId: professionalId, type: 'INCOME', datetime: { gte: from, lte: to } },
    select: { tipAmount: true },
  });
  for (const t of directTips) {
    totalTips += Number(t.tipAmount);
  }

  return totalTips;
}

export async function settleCommission(input: { professionalId: string; periodStart: Date; periodEnd: Date }) {
  const preview = await getCommissionPreview(input.professionalId, input.periodStart, input.periodEnd);

  return prisma.commissionSettlement.create({
    data: {
      professionalId: input.professionalId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      totalServiceAmount: preview.totalServiceAmount,
      commissionPctApplied: preview.commissionPct,
      totalCommission: preview.totalCommission,
      totalTips: preview.totalTips,
      breakdown: preview.breakdown as unknown as object,
    },
  });
}

export async function listSettlements(professionalId?: string) {
  return prisma.commissionSettlement.findMany({
    where: { professionalId },
    include: { professional: true },
    orderBy: { generatedAt: 'desc' },
  });
}

export async function markSettlementPaid(id: string, paid: boolean) {
  const existing = await prisma.commissionSettlement.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Liquidacion no encontrada');
  return prisma.commissionSettlement.update({ where: { id }, data: { paid } });
}

export async function getReportSummary(from: Date, to: Date) {
  const transactions = await prisma.transaction.findMany({
    where: { datetime: { gte: from, lte: to } },
    include: { services: { include: { professional: true } } },
  });

  const totalIncome = transactions.filter((t) => t.type === 'INCOME').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);

  const byPaymentMethod: Record<string, { gross: number; net: number }> = {};
  for (const t of transactions.filter((t) => t.type === 'INCOME')) {
    const key = t.paymentMethod;
    if (!byPaymentMethod[key]) byPaymentMethod[key] = { gross: 0, net: 0 };
    byPaymentMethod[key].gross += Number(t.amount);
    byPaymentMethod[key].net += Number(t.netAmount);
  }

  const byProfessional: Record<string, { name: string; totalServiceAmount: number }> = {};
  for (const t of transactions.filter((t) => t.type === 'INCOME')) {
    for (const s of t.services) {
      if (!byProfessional[s.professionalId]) {
        byProfessional[s.professionalId] = { name: `${s.professional.firstName} ${s.professional.lastName}`, totalServiceAmount: 0 };
      }
      byProfessional[s.professionalId].totalServiceAmount += Number(s.priceAtTransaction);
    }
  }

  return { totalIncome, totalExpense, balance: totalIncome - totalExpense, byPaymentMethod, byProfessional };
}
