import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import * as financeService from './service';

const router = Router();
router.use(authenticate, requireRole('OWNER'));

const paymentMethodEnum = z.enum(['CASH', 'TRANSFER', 'MP_QR', 'MP_POINT']);

router.get('/payment-method-fees', async (_req, res, next) => {
  try {
    res.json(await financeService.listPaymentMethodFees());
  } catch (err) {
    next(err);
  }
});

const feeSchema = z.object({
  paymentMethod: paymentMethodEnum,
  feePct: z.number().min(0).max(100),
  effectiveFrom: z.coerce.date(),
});

router.post('/payment-method-fees', async (req, res, next) => {
  try {
    const input = feeSchema.parse(req.body);
    res.status(201).json(await financeService.setPaymentMethodFee(input));
  } catch (err) {
    next(err);
  }
});

const rangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date() });

router.get('/transactions', async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const type = req.query.type ? z.enum(['INCOME', 'EXPENSE']).parse(req.query.type) : undefined;
    const paymentMethod = req.query.paymentMethod ? paymentMethodEnum.parse(req.query.paymentMethod) : undefined;
    res.json(await financeService.listTransactions({ from, to, type, paymentMethod }));
  } catch (err) {
    next(err);
  }
});

const createTransactionSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.number().min(0),
    paymentMethod: paymentMethodEnum,
    concept: z.string().min(1),
    clientId: z.string().uuid().optional(),
    tipAmount: z.number().min(0).optional(),
    tipProfessionalId: z.string().uuid().optional(),
    datetime: z.coerce.date(),
    services: z.array(z.object({ serviceId: z.string().uuid(), professionalId: z.string().uuid() })).optional(),
  })
  .refine((data) => data.amount > 0 || (data.tipAmount ?? 0) > 0, {
    message: 'El monto tiene que ser mayor a 0 (o cargar una propina)',
    path: ['amount'],
  });

router.post('/transactions', async (req, res, next) => {
  try {
    const input = createTransactionSchema.parse(req.body);
    const transaction = await financeService.createTransaction({ ...input, createdByUserId: req.user!.userId });
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
});

const updateTransactionSchema = z.object({
  amount: z.number().min(0).optional(),
  tipAmount: z.number().min(0).optional(),
  tipProfessionalId: z.string().uuid().nullable().optional(),
  paymentMethod: paymentMethodEnum.optional(),
  concept: z.string().min(1).optional(),
});

router.patch('/transactions/:id', async (req, res, next) => {
  try {
    const input = updateTransactionSchema.parse(req.body);
    const transaction = await financeService.updateTransaction(req.params.id, input);
    res.json(transaction);
  } catch (err) {
    next(err);
  }
});

router.delete('/transactions/:id', async (req, res, next) => {
  try {
    await financeService.deleteTransaction(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/cash-register', async (req, res, next) => {
  try {
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    res.json(await financeService.getCashRegisterSummary(date));
  } catch (err) {
    next(err);
  }
});

const openRegisterSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), openingBalance: z.number().min(0) });

router.post('/cash-register/open', async (req, res, next) => {
  try {
    const input = openRegisterSchema.parse(req.body);
    res.status(201).json(await financeService.openCashRegister(input.date, input.openingBalance));
  } catch (err) {
    next(err);
  }
});

router.post('/cash-register/close', async (req, res, next) => {
  try {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
    res.json(await financeService.closeCashRegister(date, req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.get('/cash-register/history', async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    res.json(await financeService.listCashRegisterHistory(from, to));
  } catch (err) {
    next(err);
  }
});

router.get('/commissions/rates', async (req, res, next) => {
  try {
    const professionalId = req.query.professionalId ? z.string().uuid().parse(req.query.professionalId) : undefined;
    res.json(await financeService.listCommissionRates(professionalId));
  } catch (err) {
    next(err);
  }
});

const setRateSchema = z.object({
  professionalId: z.string().uuid(),
  categoryId: z.string().uuid(),
  commissionPct: z.number().min(0).max(100),
});

router.put('/commissions/rates', async (req, res, next) => {
  try {
    res.json(await financeService.setCommissionRate(setRateSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

router.delete('/commissions/rates', async (req, res, next) => {
  try {
    const professionalId = z.string().uuid().parse(req.query.professionalId);
    const categoryId = z.string().uuid().parse(req.query.categoryId);
    await financeService.deleteCommissionRate(professionalId, categoryId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/commissions/preview', async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    const professionalId = z.string().uuid().parse(req.query.professionalId);
    res.json(await financeService.getCommissionPreview(professionalId, from, to));
  } catch (err) {
    next(err);
  }
});

const settleSchema = z.object({ professionalId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date() });

router.post('/commissions/settle', async (req, res, next) => {
  try {
    const input = settleSchema.parse(req.body);
    res.status(201).json(await financeService.settleCommission(input));
  } catch (err) {
    next(err);
  }
});

router.get('/commissions/settlements', async (req, res, next) => {
  try {
    const professionalId = req.query.professionalId ? z.string().uuid().parse(req.query.professionalId) : undefined;
    res.json(await financeService.listSettlements(professionalId));
  } catch (err) {
    next(err);
  }
});

router.patch('/commissions/settlements/:id', async (req, res, next) => {
  try {
    const { paid } = z.object({ paid: z.boolean() }).parse(req.body);
    res.json(await financeService.markSettlementPaid(req.params.id, paid));
  } catch (err) {
    next(err);
  }
});

router.get('/reports/summary', async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    res.json(await financeService.getReportSummary(from, to));
  } catch (err) {
    next(err);
  }
});

export default router;
