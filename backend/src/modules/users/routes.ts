import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';
import { AppError } from '../../lib/errors';

const router = Router();
router.use(authenticate, requireRole('SYSADMIN', 'OWNER'));

// Listar todos los usuarios con su rol y profesional asociado
router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        professionalId: true,
        createdAt: true,
        professional: {
          select: { id: true, firstName: true, lastName: true, position: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  role: z.enum(['SYSADMIN', 'OWNER', 'PROFESSIONAL']),
  professionalId: z.string().uuid().nullable().optional(),
});

// Crear usuario nuevo
router.post('/', async (req, res, next) => {
  try {
    const input = createUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'Ya existe un usuario registrado con ese email');

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role,
        professionalId: input.professionalId ?? null,
      },
      select: { id: true, email: true, role: true, active: true, professionalId: true },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

const updateUserSchema = z.object({
  role: z.enum(['SYSADMIN', 'OWNER', 'PROFESSIONAL']).optional(),
  active: z.boolean().optional(),
  professionalId: z.string().uuid().nullable().optional(),
});

// Actualizar rol, estado o vinculo a profesional de un usuario
router.patch('/:id', async (req, res, next) => {
  try {
    const input = updateUserSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Usuario no encontrado');

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        role: input.role ?? undefined,
        active: input.active ?? undefined,
        professionalId: input.professionalId !== undefined ? input.professionalId : undefined,
      },
      select: { id: true, email: true, role: true, active: true, professionalId: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(4),
});

// Restablecer / blanquear la contraseña de cualquier usuario
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const { newPassword } = resetPasswordSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError(404, 'Usuario no encontrado');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    res.json({ message: 'Contraseña restablecida con éxito' });
  } catch (err) {
    next(err);
  }
});

export default router;
