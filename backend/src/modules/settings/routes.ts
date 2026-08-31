import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Endpoint público/autenticado para consultar la configuración de la marca
router.get('/', async (req, res, next) => {
  try {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: 'default', salonName: 'Barby Nails & Spa', logoUrl: null },
      });
    }
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

const updateSettingsSchema = z.object({
  salonName: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  accentColor: z.string().nullable().optional(),
});

// Endpoint exclusivo para SysAdmin y Owner para actualizar la marca (nombre y logo)
router.put('/', authenticate, requireRole('SYSADMIN', 'OWNER'), async (req, res, next) => {
  try {
    const input = updateSettingsSchema.parse(req.body);
    const updated = await prisma.systemSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        salonName: input.salonName,
        logoUrl: input.logoUrl ?? null,
        accentColor: input.accentColor ?? '#ec4899',
      },
      update: {
        salonName: input.salonName,
        logoUrl: input.logoUrl ?? null,
        accentColor: input.accentColor ?? '#ec4899',
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
