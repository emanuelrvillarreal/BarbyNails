import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

const router = Router();
router.use(authenticate);

router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

const categorySchema = z.object({ name: z.string().min(1), displayOrder: z.number().int() });

router.post('/categories', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = categorySchema.parse(req.body);
    const category = await prisma.serviceCategory.create({ data: input });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

const categoryUpdateSchema = categorySchema.partial().extend({ active: z.boolean().optional() });

router.patch('/categories/:id', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = categoryUpdateSchema.parse(req.body);
    const existing = await prisma.serviceCategory.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Categoria no encontrada');

    const category = await prisma.serviceCategory.update({ where: { id: req.params.id }, data: input });
    res.json(category);
  } catch (err) {
    next(err);
  }
});

router.get('/services', async (_req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

const createServiceSchema = z.object({
  name: z.string().min(1),
  categoryId: z.string().uuid(),
  price: z.number().positive(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().min(0).default(0),
});

router.post('/services', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = createServiceSchema.parse(req.body);
    const service = await prisma.service.create({ data: input, include: { category: true } });
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

const updateServiceSchema = createServiceSchema.partial().extend({ active: z.boolean().optional() });

router.patch('/services/:id', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = updateServiceSchema.parse(req.body);
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Servicio no encontrado');

    // El precio/duracion actuales solo afectan turnos futuros: los ya agendados
    // guardan su propio snapshot en AppointmentService, asi que editar aca es seguro.
    const service = await prisma.service.update({ where: { id: req.params.id }, data: input, include: { category: true } });
    res.json(service);
  } catch (err) {
    next(err);
  }
});

export default router;
