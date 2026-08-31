import type { PaymentMethod } from '../api/types';

// Unica fuente de verdad para los medios de pago del sistema. Agregar un
// medio nuevo (ej. otra billetera virtual) es cambiar el enum de Prisma +
// esta lista - nunca duplicar el Record en cada pantalla que lo usa.
export const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'TRANSFER', 'MP_QR', 'MP_POINT', 'CREDIT_CARD', 'DEBIT_CARD'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  MP_QR: 'Mercado Pago QR',
  MP_POINT: 'Mercado Pago Point',
  CREDIT_CARD: 'Tarjeta de Crédito',
  DEBIT_CARD: 'Tarjeta de Débito',
};
