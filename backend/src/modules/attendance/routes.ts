import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

const router = Router();
router.use(authenticate);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function dayBounds(date: string) {
  return { from: new Date(`${date}T00:00:00.000Z`), to: new Date(`${date}T23:59:59.999Z`) };
}

// Owner ve la asistencia de todo el personal para el dia; Profesional solo la propia.
router.get('/', async (req, res, next) => {
  try {
    const date = dateSchema.parse(req.query.date);

    const professionals = await prisma.professional.findMany({
      where: { active: true, ...(req.user!.role === 'PROFESSIONAL' ? { id: req.user!.professionalId! } : {}) },
      orderBy: { displayOrder: 'asc' },
    });

    const { from } = dayBounds(date);
    const records = await prisma.attendanceRecord.findMany({
      where: { date: from, professionalId: { in: professionals.map((p) => p.id) } },
    });

    const byProfessional = new Map(records.map((r) => [r.professionalId, r]));

    res.json(
      professionals.map((p) => ({
        professional: p,
        record: byProfessional.get(p.id) ?? null,
      })),
    );
  } catch (err) {
    next(err);
  }
});

// Liviano: solo las ausencias (para pintar de negro la columna en la Agenda),
// en un rango de fechas de una sola consulta en vez de dia por dia.
router.get('/absences', async (req, res, next) => {
  try {
    const rangeSchema = z.object({ from: dateSchema, to: dateSchema });
    const { from, to } = rangeSchema.parse(req.query);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        status: { in: ['ABSENT', 'JUSTIFIED_ABSENCE'] },
        date: { gte: dayBounds(from).from, lte: dayBounds(to).from },
        ...(req.user!.role === 'PROFESSIONAL' ? { professionalId: req.user!.professionalId! } : {}),
      },
      select: { professionalId: true, date: true, status: true },
    });

    res.json(records.map((r) => ({ professionalId: r.professionalId, date: r.date.toISOString().slice(0, 10), status: r.status })));
  } catch (err) {
    next(err);
  }
});

const checkinSchema = z.object({ date: dateSchema.optional(), professionalId: z.string().uuid().optional() });

router.post('/checkin', async (req, res, next) => {
  try {
    const input = checkinSchema.parse(req.body);
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    const professionalId = req.user!.role === 'PROFESSIONAL' ? req.user!.professionalId! : input.professionalId;
    if (!professionalId) throw new AppError(400, 'professionalId es requerido');
    if (req.user!.role === 'PROFESSIONAL' && professionalId !== req.user!.professionalId) {
      throw new AppError(403, 'No podes marcar la asistencia de otra profesional');
    }

    const { from } = dayBounds(date);
    const record = await prisma.attendanceRecord.upsert({
      where: { professionalId_date: { professionalId, date: from } },
      create: { professionalId, date: from, checkInTime: new Date(), status: 'PRESENT', setByUserId: req.user!.userId },
      update: { checkInTime: new Date(), status: 'PRESENT', setByUserId: req.user!.userId },
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const input = checkinSchema.parse(req.body);
    const date = input.date ?? new Date().toISOString().slice(0, 10);

    const professionalId = req.user!.role === 'PROFESSIONAL' ? req.user!.professionalId! : input.professionalId;
    if (!professionalId) throw new AppError(400, 'professionalId es requerido');
    if (req.user!.role === 'PROFESSIONAL' && professionalId !== req.user!.professionalId) {
      throw new AppError(403, 'No podes marcar la asistencia de otra profesional');
    }

    const { from } = dayBounds(date);
    const existing = await prisma.attendanceRecord.findUnique({ where: { professionalId_date: { professionalId, date: from } } });
    if (!existing) throw new AppError(409, 'Primero hay que marcar la llegada');

    const record = await prisma.attendanceRecord.update({
      where: { professionalId_date: { professionalId, date: from } },
      data: { checkOutTime: new Date(), setByUserId: req.user!.userId },
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
});

function parseTimeString(dateStr: string, timeStr?: string | null): Date | null | undefined {
  if (timeStr === undefined) return undefined;
  if (!timeStr || timeStr.trim() === '') return null;
  if (/^\d{2}:\d{2}$/.test(timeStr.trim())) {
    return new Date(`${dateStr}T${timeStr.trim()}:00.000Z`);
  }
  const parsed = new Date(timeStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const setStatusSchema = z.object({
  professionalId: z.string().uuid(),
  date: dateSchema,
  status: z.enum(['PRESENT', 'LATE', 'EARLY_DEPARTURE', 'ABSENT', 'JUSTIFIED_ABSENCE']),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// Solo la dueña puede setear libremente cualquier estado y horarios, para cualquier profesional y fecha.
router.put('/status', requireRole('OWNER'), async (req, res, next) => {
  try {
    const input = setStatusSchema.parse(req.body);
    const { from } = dayBounds(input.date);

    const parsedCheckIn = parseTimeString(input.date, input.checkInTime);
    const parsedCheckOut = parseTimeString(input.date, input.checkOutTime);

    const updateData: any = {
      status: input.status,
      notes: input.notes ?? null,
      setByUserId: req.user!.userId,
    };
    if (parsedCheckIn !== undefined) updateData.checkInTime = parsedCheckIn;
    if (parsedCheckOut !== undefined) updateData.checkOutTime = parsedCheckOut;

    const record = await prisma.attendanceRecord.upsert({
      where: { professionalId_date: { professionalId: input.professionalId, date: from } },
      create: {
        professionalId: input.professionalId,
        date: from,
        status: input.status,
        checkInTime: parsedCheckIn ?? null,
        checkOutTime: parsedCheckOut ?? null,
        notes: input.notes ?? null,
        setByUserId: req.user!.userId,
      },
      update: updateData,
    });

    res.json(record);
  } catch (err) {
    next(err);
  }
});

const statusLabels: Record<string, string> = {
  PRESENT: 'Presente',
  LATE: 'Llegó tarde',
  EARLY_DEPARTURE: 'Se fue antes',
  ABSENT: 'Ausente',
  JUSTIFIED_ABSENCE: 'Ausencia justificada',
};

// Exportar planilla de asistencia a CSV/Excel
router.get('/export', requireRole('OWNER'), async (req, res, next) => {
  try {
    const fromStr = (req.query.from as string) || new Date().toISOString().slice(0, 7) + '-01';
    const toStr = (req.query.to as string) || new Date().toISOString().slice(0, 10);

    const { from } = dayBounds(fromStr);
    const { to } = dayBounds(toStr);

    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      include: {
        professional: true,
      },
      orderBy: [{ date: 'asc' }, { professional: { displayOrder: 'asc' } }],
    });

    // Formato CSV UTF-8 BOM con separador de punto y coma (;) para abrir directo en Excel
    let csv = '\uFEFF';
    csv += 'Fecha;Profesional;Horario Entrada;Horario Salida;Estado;Observaciones\n';

    for (const r of records) {
      const dateFormatted = new Date(r.date).toISOString().slice(0, 10);
      const profName = `${r.professional.firstName} ${r.professional.lastName}`;
      const inTime = r.checkInTime ? new Date(r.checkInTime).toISOString().slice(11, 16) : '-';
      const outTime = r.checkOutTime ? new Date(r.checkOutTime).toISOString().slice(11, 16) : '-';
      const statusLabel = statusLabels[r.status] || r.status;
      const notesClean = (r.notes || '').replace(/"/g, '""');

      csv += `"${dateFormatted}";"${profName}";"${inTime}";"${outTime}";"${statusLabel}";"${notesClean}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=asistencia_${fromStr}_al_${toStr}.csv`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
