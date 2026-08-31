import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { authenticate, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const professionals = await prisma.professional.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
      include: { schedules: { where: { active: true } } },
    });
    res.json(professionals);
  } catch (err) {
    next(err);
  }
});

// Endpoint para que la profesional consulte su propio perfil
router.get('/me', async (req, res, next) => {
  try {
    const profId = req.user!.professionalId;
    if (!profId) throw new AppError(400, 'El usuario no está vinculado a una profesional');

    const professional = await prisma.professional.findUnique({
      where: { id: profId },
      include: { schedules: { where: { active: true } } },
    });
    if (!professional) throw new AppError(404, 'Profesional no encontrada');

    res.json(professional);
  } catch (err) {
    next(err);
  }
});

const selfUpdateSchema = z.object({
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  bankAlias: z.string().nullable().optional(),
  bankCbu: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
});

// Endpoint para que la profesional edite sus datos personales y bancarios
router.patch('/me', async (req, res, next) => {
  try {
    const profId = req.user!.professionalId;
    if (!profId) throw new AppError(400, 'El usuario no está vinculado a una profesional');

    const input = selfUpdateSchema.parse(req.body);
    const updated = await prisma.professional.update({
      where: { id: profId },
      data: {
        phone: input.phone ?? undefined,
        email: input.email ?? undefined,
        address: input.address ?? undefined,
        bankAlias: input.bankAlias ?? undefined,
        bankCbu: input.bankCbu ?? undefined,
        bankName: input.bankName ?? undefined,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  hireDate: z.coerce.date().optional(),
  position: z.string().optional(),
  bankAlias: z.string().optional(),
  bankCbu: z.string().optional(),
  bankName: z.string().optional(),
  colorHex: z.string().min(1),
  commissionPct: z.number().min(0).max(100),
  displayOrder: z.number().int(),
  schedules: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
      }),
    )
    .optional(),
});

router.post('/', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const professional = await prisma.professional.create({
      data: {
        ...input,
        schedules: input.schedules ? { create: input.schedules } : undefined,
      },
      include: { schedules: true },
    });
    res.status(201).json(professional);
  } catch (err) {
    next(err);
  }
});

const updateSchema = createSchema.partial().extend({ active: z.boolean().optional() });

router.patch('/:id', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const { schedules, ...data } = input;

    const existing = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Profesional no encontrada');

    const professional = await prisma.$transaction(async (tx) => {
      if (schedules) {
        await tx.professionalSchedule.deleteMany({ where: { professionalId: req.params.id } });
        if (schedules.length > 0) {
          await tx.professionalSchedule.createMany({
            data: schedules.map((s) => ({ ...s, professionalId: req.params.id })),
          });
        }
      }
      return tx.professional.update({
        where: { id: req.params.id },
        data,
        include: { schedules: { where: { active: true } } },
      });
    });

    res.json(professional);
  } catch (err) {
    next(err);
  }
});

const createLoginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

router.post('/:id/login', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = createLoginSchema.parse(req.body);

    const professional = await prisma.professional.findUnique({ where: { id: req.params.id } });
    if (!professional) throw new AppError(404, 'Profesional no encontrada');

    const existingUser = await prisma.user.findFirst({ where: { professionalId: req.params.id } });
    if (existingUser) throw new AppError(409, 'Esta profesional ya tiene un usuario de acceso');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: { email: input.email, passwordHash, role: 'PROFESSIONAL', professionalId: req.params.id },
    });

    res.status(201).json({ id: user.id, email: user.email });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/login', requireRole('OWNER'), async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({ where: { professionalId: req.params.id }, select: { id: true, email: true, active: true } });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
