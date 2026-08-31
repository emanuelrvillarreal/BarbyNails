import { WhatsappCampaignType, WhatsappReminderStatus, WhatsappTemplateType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';

function resolvePlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => vars[key] ?? match);
}

// ---------- Plantillas ----------

export async function listTemplates(type?: WhatsappTemplateType) {
  return prisma.whatsappMessageTemplate.findMany({
    where: { active: true, type },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createTemplate(input: { type: WhatsappTemplateType; name: string; bodyText: string }) {
  return prisma.whatsappMessageTemplate.create({ data: input });
}

export async function updateTemplate(id: string, input: Partial<{ name: string; bodyText: string; active: boolean }>) {
  const existing = await prisma.whatsappMessageTemplate.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Plantilla no encontrada');
  return prisma.whatsappMessageTemplate.update({ where: { id }, data: input });
}

// ---------- Recordatorios de turno ----------

export async function listReminders(from: Date, to: Date) {
  const appointments = await prisma.appointment.findMany({
    where: { startDatetime: { gte: from, lte: to } },
    include: { client: true, professional: true, services: { include: { service: true } }, whatsappReminder: true },
    orderBy: { startDatetime: 'asc' },
  });
  return appointments;
}

export async function getReminderPreview(appointmentId: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true, professional: true, services: { include: { service: true } } },
  });
  if (!appointment) throw new AppError(404, 'Turno no encontrado');

  const template = await prisma.whatsappMessageTemplate.findFirst({
    where: { type: 'APPOINTMENT_REMINDER', active: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!template) throw new AppError(404, 'No hay ninguna plantilla de recordatorio de turno activa. Cargá una primero.');

  const vars = {
    nombre: appointment.client.firstName,
    apellido: appointment.client.lastName,
    fecha: appointment.startDatetime.toISOString().slice(0, 10).split('-').reverse().join('/'),
    hora: appointment.startDatetime.toISOString().slice(11, 16),
    profesional: appointment.professional.firstName,
    servicios: appointment.services.map((s) => s.service.name).join(', '),
  };

  return {
    phone: appointment.client.phone,
    message: resolvePlaceholders(template.bodyText, vars),
  };
}

export async function markReminderSent(appointmentId: string, sentByUserId: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new AppError(404, 'Turno no encontrado');

  return prisma.whatsappReminder.upsert({
    where: { appointmentId },
    create: { appointmentId, sentAt: new Date(), sentByUserId, status: 'SENT' },
    update: { sentAt: new Date(), sentByUserId, status: 'SENT', statusUpdatedAt: null },
  });
}

export async function updateReminderStatus(appointmentId: string, status: WhatsappReminderStatus) {
  const reminder = await prisma.whatsappReminder.findUnique({ where: { appointmentId } });
  if (!reminder) throw new AppError(404, 'Todavia no se envio ningun recordatorio para este turno');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.whatsappReminder.update({
      where: { appointmentId },
      data: { status, statusUpdatedAt: new Date() },
    });

    if (status === 'CONFIRMED') {
      await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'CONFIRMED' } });
    } else if (status === 'CANCELLED') {
      await tx.appointment.update({ where: { id: appointmentId }, data: { status: 'CANCELLED', cancelledReason: 'Cancelado por WhatsApp' } });
    }

    return updated;
  });
}

// ---------- Campañas (pago pendiente / promociones) ----------

export async function createCampaign(input: {
  templateId: string;
  type: WhatsappCampaignType;
  recipients: { clientId: string; appointmentId?: string }[];
  createdByUserId: string;
}) {
  const template = await prisma.whatsappMessageTemplate.findUnique({ where: { id: input.templateId } });
  if (!template) throw new AppError(404, 'Plantilla no encontrada');
  if (input.recipients.length === 0) throw new AppError(400, 'Elegi al menos una clienta');

  // Pago pendiente necesita un turno puntual para poder completar {monto},
  // {servicios}, {fecha}, {hora} y {profesional} en la plantilla.
  if (input.type === 'PAYMENT_PENDING') {
    if (input.recipients.some((r) => !r.appointmentId)) {
      throw new AppError(400, 'Para "Pago pendiente" tenes que elegir el turno correspondiente a cada clienta');
    }
    const appointments = await prisma.appointment.findMany({
      where: { id: { in: input.recipients.map((r) => r.appointmentId!) } },
    });
    for (const r of input.recipients) {
      const appt = appointments.find((a) => a.id === r.appointmentId);
      if (!appt) throw new AppError(404, 'Uno de los turnos elegidos no existe');
      if (appt.clientId !== r.clientId) throw new AppError(400, 'El turno elegido no corresponde a esa clienta');
    }
  }

  return prisma.whatsappCampaign.create({
    data: {
      templateId: input.templateId,
      type: input.type,
      createdByUserId: input.createdByUserId,
      recipients: { create: input.recipients.map((r) => ({ clientId: r.clientId, appointmentId: r.appointmentId })) },
    },
    include: { template: true, recipients: { include: { client: true } } },
  });
}

export async function deleteCampaign(id: string) {
  const existing = await prisma.whatsappCampaign.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Campaña no encontrada');
  await prisma.whatsappCampaign.delete({ where: { id } });
}

export async function listCampaigns(type?: WhatsappCampaignType) {
  return prisma.whatsappCampaign.findMany({
    where: { type },
    include: { template: true, recipients: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCampaign(id: string) {
  const campaign = await prisma.whatsappCampaign.findUnique({
    where: { id },
    include: {
      template: true,
      recipients: {
        include: {
          client: true,
          appointment: { include: { professional: true, services: { include: { service: true } } } },
        },
      },
    },
  });
  if (!campaign) throw new AppError(404, 'Campaña no encontrada');

  const recipientsWithMessage = campaign.recipients.map((r) => {
    const vars: Record<string, string> = {
      nombre: r.client.firstName,
      apellido: r.client.lastName,
    };
    if (r.appointment) {
      const monto = r.appointment.services.reduce((sum, s) => sum + Number(s.priceAtBooking), 0);
      vars.monto = monto.toLocaleString('es-AR');
      vars.servicios = r.appointment.services.map((s) => s.service.name).join(', ');
      vars.fecha = r.appointment.startDatetime.toISOString().slice(0, 10).split('-').reverse().join('/');
      vars.hora = r.appointment.startDatetime.toISOString().slice(11, 16);
      vars.profesional = r.appointment.professional.firstName;
    }
    return { ...r, message: resolvePlaceholders(campaign.template.bodyText, vars) };
  });

  return { ...campaign, recipients: recipientsWithMessage };
}

export async function markRecipientSent(campaignId: string, recipientId: string) {
  const recipient = await prisma.whatsappCampaignRecipient.findUnique({ where: { id: recipientId } });
  if (!recipient || recipient.campaignId !== campaignId) throw new AppError(404, 'Destinataria no encontrada en esta campaña');

  return prisma.whatsappCampaignRecipient.update({
    where: { id: recipientId },
    data: { sentAt: new Date(), status: 'SENT' },
  });
}
