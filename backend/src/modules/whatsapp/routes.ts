import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import * as whatsappService from './service';

const router = Router();
router.use(authenticate);

const templateTypeEnum = z.enum(['APPOINTMENT_REMINDER', 'PAYMENT_PENDING', 'PROMOTION']);
const campaignTypeEnum = z.enum(['PAYMENT_PENDING', 'PROMOTION']);
const reminderStatusEnum = z.enum(['SENT', 'CONFIRMED', 'CANCELLED', 'NO_RESPONSE']);

async function assertCanTouchAppointment(req: import('express').Request, appointmentId: string) {
  if (req.user!.role === 'OWNER') return;
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment || appointment.professionalId !== req.user!.professionalId) {
    throw new AppError(403, 'No podes notificar un turno que no es tuyo');
  }
}

router.get('/templates', requireRole('OWNER'), async (req, res, next) => {
  try {
    const type = req.query.type ? templateTypeEnum.parse(req.query.type) : undefined;
    res.json(await whatsappService.listTemplates(type));
  } catch (err) {
    next(err);
  }
});

const templateSchema = z.object({ type: templateTypeEnum, name: z.string().min(1), bodyText: z.string().min(1) });

router.post('/templates', requireRole('OWNER'), async (req, res, next) => {
  try {
    res.status(201).json(await whatsappService.createTemplate(templateSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

router.patch('/templates/:id', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = templateSchema.partial().extend({ active: z.boolean().optional() }).parse(req.body);
    res.json(await whatsappService.updateTemplate(req.params.id, input));
  } catch (err) {
    next(err);
  }
});

const rangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date() });

// Pantalla de seguimiento (todos los recordatorios): solo la dueña ve el panorama completo.
router.get('/reminders', requireRole('OWNER'), async (req, res, next) => {
  try {
    const { from, to } = rangeSchema.parse(req.query);
    res.json(await whatsappService.listReminders(from, to));
  } catch (err) {
    next(err);
  }
});

// Notificar un turno puntual: tanto la dueña como la profesional pueden hacerlo
// desde la Agenda, pero la profesional solo para sus propios turnos.
router.get('/reminders/:appointmentId/preview', async (req, res, next) => {
  try {
    await assertCanTouchAppointment(req, req.params.appointmentId);
    res.json(await whatsappService.getReminderPreview(req.params.appointmentId));
  } catch (err) {
    next(err);
  }
});

router.post('/reminders/:appointmentId/mark-sent', async (req, res, next) => {
  try {
    await assertCanTouchAppointment(req, req.params.appointmentId);
    res.json(await whatsappService.markReminderSent(req.params.appointmentId, req.user!.userId));
  } catch (err) {
    next(err);
  }
});

router.patch('/reminders/:appointmentId/status', async (req, res, next) => {
  try {
    await assertCanTouchAppointment(req, req.params.appointmentId);
    const { status } = z.object({ status: reminderStatusEnum }).parse(req.body);
    res.json(await whatsappService.updateReminderStatus(req.params.appointmentId, status));
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns', requireRole('OWNER'), async (req, res, next) => {
  try {
    const type = req.query.type ? campaignTypeEnum.parse(req.query.type) : undefined;
    res.json(await whatsappService.listCampaigns(type));
  } catch (err) {
    next(err);
  }
});

const createCampaignSchema = z.object({
  templateId: z.string().uuid(),
  type: campaignTypeEnum,
  clientIds: z.array(z.string().uuid()).min(1),
});

router.post('/campaigns', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = createCampaignSchema.parse(req.body);
    res.status(201).json(await whatsappService.createCampaign({ ...input, createdByUserId: req.user!.userId }));
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns/:id', requireRole('OWNER'), async (req, res, next) => {
  try {
    res.json(await whatsappService.getCampaign(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/campaigns/:id/recipients/:recipientId/mark-sent', requireRole('OWNER'), async (req, res, next) => {
  try {
    res.json(await whatsappService.markRecipientSent(req.params.id, req.params.recipientId));
  } catch (err) {
    next(err);
  }
});

export default router;
