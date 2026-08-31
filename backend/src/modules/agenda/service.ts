import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

const SLOT_MINUTES = 30;

async function computeAppointmentSpan(serviceIds: string[]) {
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds } } });
  if (services.length !== serviceIds.length) {
    throw new AppError(400, 'Uno o mas servicios seleccionados no existen');
  }
  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const maxBuffer = services.reduce((max, s) => Math.max(max, s.bufferMinutes), 0);
  return { services, totalDuration, maxBuffer };
}

export async function listAppointments(filters: { from: Date; to: Date; professionalId?: string }) {
  return prisma.appointment.findMany({
    where: {
      professionalId: filters.professionalId,
      startDatetime: { lt: filters.to },
      endDatetime: { gt: filters.from },
    },
    include: {
      client: true,
      professional: true,
      services: { include: { service: true } },
    },
    orderBy: { startDatetime: 'asc' },
  });
}

export async function getAppointmentById(id: string) {
  return prisma.appointment.findUnique({ where: { id } });
}

export async function createAppointment(input: {
  clientId: string;
  professionalId: string;
  startDatetime: Date;
  serviceIds: string[];
  createdByUserId: string;
}) {
  const { services, totalDuration, maxBuffer } = await computeAppointmentSpan(input.serviceIds);
  const endDatetime = new Date(input.startDatetime.getTime() + (totalDuration + maxBuffer) * 60_000);

  const overlap = await prisma.appointment.findFirst({
    where: {
      professionalId: input.professionalId,
      status: { not: 'CANCELLED' },
      startDatetime: { lt: endDatetime },
      endDatetime: { gt: input.startDatetime },
    },
  });
  if (overlap) {
    throw new AppError(409, 'La profesional ya tiene un turno en ese horario');
  }

  const appointment = await prisma.$transaction(async (tx) => {
    const created = await tx.appointment.create({
      data: {
        clientId: input.clientId,
        professionalId: input.professionalId,
        startDatetime: input.startDatetime,
        endDatetime,
        status: 'PENDING',
        createdByUserId: input.createdByUserId,
      },
    });

    await tx.appointmentService.createMany({
      data: services.map((s) => ({
        appointmentId: created.id,
        serviceId: s.id,
        priceAtBooking: s.price,
        durationMinutesAtBooking: s.durationMinutes,
        bufferMinutesAtBooking: s.bufferMinutes,
      })),
    });

    return created;
  });

  return prisma.appointment.findUniqueOrThrow({
    where: { id: appointment.id },
    include: { client: true, professional: true, services: { include: { service: true } } },
  });
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, cancelledReason?: string) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Turno no encontrado');

  return prisma.appointment.update({
    where: { id },
    data: {
      status,
      cancelledReason: status === 'CANCELLED' ? cancelledReason ?? null : null,
    },
    include: { client: true, professional: true, services: { include: { service: true } } },
  });
}

// Todo el calculo de huecos se hace en UTC puro (getUTCDay/setUTCDate/setUTCHours),
// nunca con los metodos locales (getDay/setDate/setHours): estos dependen del huso
// horario de la maquina donde corre el proceso, y como los horarios de los
// profesionales (@db.Time) y los turnos se guardan en UTC, mezclar local+UTC hace
// que el dia de la semana calculado no coincida segun donde este deployado el server.
function combineDateAndTime(date: Date, time: Date): Date {
  const result = new Date(date);
  result.setUTCHours(time.getUTCHours(), time.getUTCMinutes(), 0, 0);
  return result;
}

// Clientas que alguna vez tuvieron un turno con esta profesional (aunque haya
// sido cancelado), ordenadas por la ultima vez que la atendio.
export async function listMyClients(professionalId: string) {
  const appointments = await prisma.appointment.findMany({
    where: { professionalId },
    select: { startDatetime: true, client: true },
    orderBy: { startDatetime: 'desc' },
  });

  const byClient = new Map<string, { client: (typeof appointments)[number]['client']; lastVisit: Date; visitCount: number }>();
  for (const a of appointments) {
    const existing = byClient.get(a.client.id);
    if (existing) {
      existing.visitCount += 1;
    } else {
      byClient.set(a.client.id, { client: a.client, lastVisit: a.startDatetime, visitCount: 1 });
    }
  }

  return Array.from(byClient.values()).map(({ client, lastVisit, visitCount }) => ({ ...client, lastVisit, visitCount }));
}

// Detalle de una clienta, pero recortado a lo que le corresponde a ESTA
// profesional: solo sus propios turnos y sus propios servicios cobrados
// (nunca los de otras profesionales que tambien hayan atendido a la clienta).
// Devuelve null tanto si la clienta no existe como si nunca tuvo turno con
// esta profesional, para no filtrar por error si una clienta existe en el
// sistema pero no es "suya".
export async function getMyClientDetail(professionalId: string, clientId: string) {
  const hasRelation = await prisma.appointment.findFirst({ where: { professionalId, clientId } });
  if (!hasRelation) return null;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return null;

  const appointments = await prisma.appointment.findMany({
    where: { professionalId, clientId },
    orderBy: { startDatetime: 'desc' },
    include: { services: { include: { service: true } } },
  });

  const transactionServices = await prisma.transactionService.findMany({
    where: { professionalId, transaction: { clientId } },
    include: { service: true, transaction: true },
    orderBy: { transaction: { datetime: 'desc' } },
  });

  return { client, appointments, transactionServices };
}

// Un "hueco" es cualquier franja de 30 min dentro del horario configurado de la
// profesional que no esta cubierta por un turno activo (no cancelado). No se
// guarda en ninguna tabla: se recalcula siempre a partir de professional_schedules
// + appointments, asi nunca queda desincronizado al cancelar/mover un turno.
export async function getGapsForRange(professionalId: string, from: Date, to: Date) {
  const schedules = await prisma.professionalSchedule.findMany({
    where: { professionalId, active: true },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      status: { not: 'CANCELLED' },
      startDatetime: { lt: to },
      endDatetime: { gt: from },
    },
  });

  const gapsByDate: Record<string, { start: string; end: string }[]> = {};

  for (let day = new Date(from); day <= to; day.setUTCDate(day.getUTCDate() + 1)) {
    const dayOfWeek = day.getUTCDay();
    const daySchedules = schedules.filter((s) => s.dayOfWeek === dayOfWeek);
    if (daySchedules.length === 0) continue;

    const dateKey = day.toISOString().slice(0, 10);
    const freeSlots: { start: Date; end: Date }[] = [];

    for (const sched of daySchedules) {
      const scheduleStart = combineDateAndTime(day, sched.startTime);
      const scheduleEnd = combineDateAndTime(day, sched.endTime);

      for (let slotStart = new Date(scheduleStart); slotStart < scheduleEnd; slotStart = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000)) {
        const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60_000);
        const isBusy = appointments.some((a) => a.startDatetime < slotEnd && a.endDatetime > slotStart);
        if (!isBusy) {
          freeSlots.push({ start: new Date(slotStart), end: slotEnd });
        }
      }
    }

    if (freeSlots.length > 0) {
      gapsByDate[dateKey] = freeSlots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
    }
  }

  return gapsByDate;
}
