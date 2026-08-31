import { apiFetch } from './client';
import type { Client, PaymentMethod, Professional, Service, TransactionType } from './types';

export interface PaymentMethodFee {
  id: string;
  paymentMethod: PaymentMethod;
  feePct: string;
  effectiveFrom: string;
}

export function fetchPaymentMethodFees() {
  return apiFetch<PaymentMethodFee[]>('/finance/payment-method-fees');
}

export function setPaymentMethodFee(input: { paymentMethod: PaymentMethod; feePct: number; effectiveFrom: string }) {
  return apiFetch<PaymentMethodFee>('/finance/payment-method-fees', { method: 'POST', body: JSON.stringify(input) });
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string;
  paymentMethod: PaymentMethod;
  concept: string;
  clientId: string | null;
  client: Client | null;
  tipAmount: string;
  tipProfessionalId: string | null;
  netAmount: string;
  datetime: string;
  cashRegisterId: string | null;
  services: {
    id: string;
    serviceId: string;
    professionalId: string;
    priceAtTransaction: string;
    service: Service;
    professional: Professional;
  }[];
}

export interface CashRegisterSummary {
  date: string;
  openingBalance: number;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  closed: boolean;
  closedAt: string | null;
  transactionCount: number;
}

export interface CommissionCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  serviceAmount: number;
  commissionPct: number;
  commissionAmount: number;
  isOverride: boolean;
}

export interface CommissionPreview {
  professionalId: string;
  professionalName: string;
  defaultCommissionPct: number;
  commissionPct: number;
  totalServiceAmount: number;
  totalCommission: number;
  totalTips: number;
  grandTotal: number;
  breakdown: CommissionCategoryBreakdown[];
  items: unknown[];
}

export interface CommissionRate {
  id: string;
  professionalId: string;
  categoryId: string;
  category: { id: string; name: string };
  commissionPct: string;
}

export function fetchCommissionRates(professionalId?: string) {
  const qs = professionalId ? `?professionalId=${professionalId}` : '';
  return apiFetch<CommissionRate[]>(`/finance/commissions/rates${qs}`);
}

export function setCommissionRate(input: { professionalId: string; categoryId: string; commissionPct: number }) {
  return apiFetch<CommissionRate>('/finance/commissions/rates', { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteCommissionRate(professionalId: string, categoryId: string) {
  return apiFetch<void>(`/finance/commissions/rates?professionalId=${professionalId}&categoryId=${categoryId}`, { method: 'DELETE' });
}

export interface CommissionSettlement {
  id: string;
  professionalId: string;
  professional: Professional;
  periodStart: string;
  periodEnd: string;
  totalServiceAmount: string;
  commissionPctApplied: string;
  totalCommission: string;
  totalTips: string;
  breakdown: CommissionCategoryBreakdown[] | null;
  paid: boolean;
  generatedAt: string;
}

export interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byPaymentMethod: Record<string, { gross: number; net: number }>;
  byProfessional: Record<string, { name: string; totalServiceAmount: number }>;
}

export function fetchTransactions(params: { from: Date; to: Date; type?: TransactionType; paymentMethod?: PaymentMethod }) {
  const query = new URLSearchParams({ from: params.from.toISOString(), to: params.to.toISOString() });
  if (params.type) query.set('type', params.type);
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  return apiFetch<Transaction[]>(`/finance/transactions?${query}`);
}

export interface CreateTransactionInput {
  type: TransactionType;
  amount: number;
  paymentMethod: PaymentMethod;
  concept: string;
  clientId?: string;
  tipAmount?: number;
  tipProfessionalId?: string;
  datetime: string;
  services?: { serviceId: string; professionalId: string }[];
}

export function createTransaction(input: CreateTransactionInput) {
  return apiFetch<Transaction>('/finance/transactions', { method: 'POST', body: JSON.stringify(input) });
}

export interface UpdateTransactionInput {
  amount?: number;
  tipAmount?: number;
  tipProfessionalId?: string | null;
  paymentMethod?: PaymentMethod;
  concept?: string;
}

export function updateTransaction(id: string, input: UpdateTransactionInput) {
  return apiFetch<Transaction>(`/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteTransaction(id: string) {
  return apiFetch<void>(`/finance/transactions/${id}`, { method: 'DELETE' });
}

export function fetchCashRegister(date: string) {
  return apiFetch<CashRegisterSummary>(`/finance/cash-register?date=${date}`);
}

export function openCashRegister(date: string, openingBalance: number) {
  return apiFetch('/finance/cash-register/open', { method: 'POST', body: JSON.stringify({ date, openingBalance }) });
}

export function closeCashRegister(date: string) {
  return apiFetch('/finance/cash-register/close', { method: 'POST', body: JSON.stringify({ date }) });
}

export interface CashRegisterRecord {
  id: string;
  date: string;
  openingBalance: string;
  totalIncome: string | null;
  totalExpense: string | null;
  closingBalance: string | null;
  closedAt: string | null;
}

export function fetchCashRegisterHistory(from: Date, to: Date) {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<CashRegisterRecord[]>(`/finance/cash-register/history?${query}`);
}

export function fetchCommissionPreview(professionalId: string, from: Date, to: Date) {
  const query = new URLSearchParams({ professionalId, from: from.toISOString(), to: to.toISOString() });
  return apiFetch<CommissionPreview>(`/finance/commissions/preview?${query}`);
}

export function settleCommission(input: { professionalId: string; periodStart: string; periodEnd: string }) {
  return apiFetch<CommissionSettlement>('/finance/commissions/settle', { method: 'POST', body: JSON.stringify(input) });
}

export function fetchSettlements(professionalId?: string) {
  const query = professionalId ? `?professionalId=${professionalId}` : '';
  return apiFetch<CommissionSettlement[]>(`/finance/commissions/settlements${query}`);
}

export function markSettlementPaid(id: string, paid: boolean) {
  return apiFetch<CommissionSettlement>(`/finance/commissions/settlements/${id}`, { method: 'PATCH', body: JSON.stringify({ paid }) });
}

export function fetchReportSummary(from: Date, to: Date) {
  const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiFetch<ReportSummary>(`/finance/reports/summary?${query}`);
}
