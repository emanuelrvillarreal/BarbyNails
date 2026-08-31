import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../lib/errors';
import * as agendaService from './service';
import * as clientNotesService from '../clientNotes/service';

async function assertOwnsAppointmentOrOwner(req: import('express').Request, appointmentId: string) {
  const appointment = await agendaService.getAppointmentById(appointmentId);
  if (!appointment) throw new AppError(404, 'Turno no encontrado');
  if (req.user!.role === 'PROFESSIONAL' && appointment.professionalId !== req.user!.professionalId) {
    throw new AppError(403, 'No podes ver las notas de un turno que no es tuyo');
  }
  return appointment;
}

const router = Router();
router.use(authenticate);

const rangeQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  professionalId: z.string().uuid().optional(),
});

router.get('/appointments', async (req, res, next) => {
  try {
    const query = rangeQuerySchema.parse(req.query);

    // El rol Profesional solo puede ver su propia agenda: se fuerza server-side,
    // nunca se confia en lo que mande el frontend.
    const professionalId = req.user!.role === 'PROFESSIONAL' ? req.user!.professionalId! : query.professionalId;

    const appointments = await agendaService.listAppointments({ from: query.from, to: query.to, professionalId });
    res.json(appointments);
  } catch (err) {
    next(err);
  }
});

const createAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  professionalId: z.string().uuid(),
  startDatetime: z.coerce.date(),
  serviceIds: z.array(z.string().uuid()).min(1),
});

router.post('/appointments', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = createAppointmentSchema.parse(req.body);
    const appointment = await agendaService.createAppointment({ ...input, createdByUserId: req.user!.userId });
    res.status(201).json(appointment);
  } catch (err) {
    next(err);
  }
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  cancelledReason: z.string().optional(),
});

router.patch('/appointments/:id/status', async (req, res, next) => {
  try {
    const { status, cancelledReason } = updateStatusSchema.parse(req.body);

    if (req.user!.role === 'PROFESSIONAL') {
      const existing = await agendaService.getAppointmentById(req.params.id);
      if (!existing || existing.professionalId !== req.user!.professionalId) {
        throw new AppError(403, 'No podes modificar un turno que no es tuyo');
      }
    }

    const updated = await agendaService.updateAppointmentStatus(req.params.id, status, cancelledReason);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Le muestra a la profesional la lista de sus propias clientas (con quien tuvo
// turno alguna vez) sin abrirle el CRM completo de Clientas.
router.get('/my-clients', requireRole('PROFESSIONAL'), async (req, res, next) => {
  try {
    const clients = await agendaService.listMyClients(req.user!.professionalId!);
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

router.get('/my-clients/:clientId', requireRole('PROFESSIONAL'), async (req, res, next) => {
  try {
    const detail = await agendaService.getMyClientDetail(req.user!.professionalId!, req.params.clientId);
    if (!detail) throw new AppError(404, 'No se encontro esa clienta entre tus turnos');
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.get('/gaps', async (req, res, next) => {
  try {
    const query = rangeQuerySchema.parse(req.query);
    const professionalId = req.user!.role === 'PROFESSIONAL' ? req.user!.professionalId! : query.professionalId;

    if (!professionalId) {
      throw new AppError(400, 'professionalId es requerido');
    }

    const gaps = await agendaService.getGapsForRange(professionalId, query.from, query.to);
    res.json(gaps);
  } catch (err) {
    next(err);
  }
});

// Le da a la profesional acceso puntual a las notas de la clienta de SU turno
// (historial completo, para saber alergias/cuidados de visitas anteriores),
// sin abrirle el resto del CRM de Clientas.
router.get('/appointments/:id/notes', async (req, res, next) => {
  try {
    const appointment = await assertOwnsAppointmentOrOwner(req, req.params.id);
    res.json(await clientNotesService.listNotesForClient(appointment.clientId));
  } catch (err) {
    next(err);
  }
});

const createAppointmentNoteSchema = z.object({ body: z.string().min(1) });

router.post('/appointments/:id/notes', async (req, res, next) => {
  try {
    const { body } = createAppointmentNoteSchema.parse(req.body);
    const appointment = await assertOwnsAppointmentOrOwner(req, req.params.id);

    const note = await clientNotesService.createNote({
      clientId: appointment.clientId,
      appointmentId: appointment.id,
      authorUserId: req.user!.userId,
      body,
    });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

export default router;
