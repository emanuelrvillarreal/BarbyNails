import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import * as clientNotesService from '../clientNotes/service';

const router = Router();
router.use(authenticate, requireRole('OWNER'));

function withVigencyStatus<T extends { appointments: { startDatetime: Date }[] }>(client: T) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const lastVisit = client.appointments[0]?.startDatetime ?? null;
  const isActive = lastVisit ? lastVisit >= threeMonthsAgo : false;
  const { appointments, ...rest } = client;
  return { ...rest, lastVisit, status: isActive ? 'ACTIVA' : 'INACTIVA' };
}

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status : undefined;
    const isBlacklistedFilter = req.query.blacklisted === 'true';

    const clients = await prisma.client.findMany({
      where: {
        isBlacklisted: isBlacklistedFilter,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        appointments: { where: { status: { not: 'CANCELLED' } }, orderBy: { startDatetime: 'desc' }, take: 1 },
        serviceInterests: { include: { service: true } },
      },
      orderBy: isBlacklistedFilter ? { blacklistedAt: 'desc' } : { lastName: 'asc' },
    });

    let withStatus = clients.map(withVigencyStatus);
    if (statusFilter === 'ACTIVA' || statusFilter === 'INACTIVA') {
      withStatus = withStatus.filter((c) => c.status === statusFilter);
    }

    res.json(withStatus);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        serviceInterests: { include: { service: true } },
        appointments: {
          orderBy: { startDatetime: 'desc' },
          include: { professional: true, services: { include: { service: true } } },
        },
      },
    });
    if (!client) throw new AppError(404, 'Clienta no encontrada');

    const transactions = await prisma.transaction.findMany({
      where: { clientId: req.params.id, type: 'INCOME' },
      orderBy: { datetime: 'desc' },
      include: { services: { include: { service: true, professional: true } } },
    });

    const { appointments, ...rest } = client;
    const vigency = withVigencyStatus({ appointments: appointments.filter((a) => a.status !== 'CANCELLED') });

    res.json({ ...rest, status: vigency.status, lastVisit: vigency.lastVisit, appointments, payments: transactions });
  } catch (err) {
    next(err);
  }
});

const blacklistSchema = z.object({ reason: z.string().min(1, 'Debe especificar el motivo de la baja') });

router.post('/:id/blacklist', async (req, res, next) => {
  try {
    const { reason } = blacklistSchema.parse(req.body);
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Clienta no encontrada');

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        isBlacklisted: true,
        blacklistedReason: reason,
        blacklistedAt: new Date(),
      },
    });

    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unblacklist', async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Clienta no encontrada');

    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        isBlacklisted: false,
        blacklistedReason: null,
        blacklistedAt: null,
      },
    });

    res.json(client);
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
  birthday: z.coerce.date().optional(),
  internalNotes: z.string().optional(),
  isSavedContact: z.boolean().optional(),
  serviceInterestIds: z.array(z.string().uuid()).optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const { serviceInterestIds, ...clientData } = input;

    const client = await prisma.client.create({
      data: {
        ...clientData,
        serviceInterests: serviceInterestIds
          ? { create: serviceInterestIds.map((serviceId) => ({ serviceId })) }
          : undefined,
      },
      include: { serviceInterests: { include: { service: true } } },
    });

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

const updateSchema = createSchema.partial();

router.patch('/:id', async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const { serviceInterestIds, ...clientData } = input;

    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Clienta no encontrada');

    const client = await prisma.$transaction(async (tx) => {
      if (serviceInterestIds) {
        await tx.clientServiceInterest.deleteMany({ where: { clientId: req.params.id } });
        if (serviceInterestIds.length > 0) {
          await tx.clientServiceInterest.createMany({
            data: serviceInterestIds.map((serviceId) => ({ clientId: req.params.id, serviceId })),
          });
        }
      }
      return tx.client.update({
        where: { id: req.params.id },
        data: clientData,
        include: { serviceInterests: { include: { service: true } } },
      });
    });

    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/notes', async (req, res, next) => {
  try {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Clienta no encontrada');
    res.json(await clientNotesService.listNotesForClient(req.params.id));
  } catch (err) {
    next(err);
  }
});

const createNoteSchema = z.object({ body: z.string().min(1), appointmentId: z.string().uuid().optional() });

router.post('/:id/notes', async (req, res, next) => {
  try {
    const input = createNoteSchema.parse(req.body);
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Clienta no encontrada');

    const note = await clientNotesService.createNote({
      clientId: req.params.id,
      appointmentId: input.appointmentId,
      authorUserId: req.user!.userId,
      body: input.body,
    });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

export default router;
