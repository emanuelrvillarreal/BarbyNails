import { prisma } from '../../lib/prisma';

export async function listNotesForClient(clientId: string) {
  return prisma.clientNote.findMany({
    where: { clientId },
    include: { author: { select: { id: true, email: true, role: true, professional: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createNote(input: { clientId: string; appointmentId?: string; authorUserId: string; body: string }) {
  return prisma.clientNote.create({
    data: input,
    include: { author: { select: { id: true, email: true, role: true, professional: { select: { firstName: true, lastName: true } } } } },
  });
}
