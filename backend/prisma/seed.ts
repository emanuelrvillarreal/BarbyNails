import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const category = await prisma.serviceCategory.create({
    data: { name: 'Manos', displayOrder: 1 },
  });

  const service = await prisma.service.create({
    data: {
      name: 'Manicura semipermanente',
      categoryId: category.id,
      price: 8000,
      durationMinutes: 45,
      bufferMinutes: 15,
    },
  });

  // Martes a sabado, 9 a 18hs
  const workDays = [2, 3, 4, 5, 6];

  const professional = await prisma.professional.create({
    data: {
      firstName: 'Luciana',
      lastName: 'Perez',
      colorHex: '#f472b6',
      commissionPct: 40,
      displayOrder: 1,
      schedules: {
        create: workDays.map((dayOfWeek) => ({
          dayOfWeek,
          startTime: new Date('1970-01-01T09:00:00Z'),
          endTime: new Date('1970-01-01T18:00:00Z'),
        })),
      },
    },
  });

  const sysPasswordHash = await bcrypt.hash('sysadmin123', 10);
  await prisma.user.upsert({
    where: { email: 'sysadmin@barbynails.com' },
    create: {
      email: 'sysadmin@barbynails.com',
      passwordHash: sysPasswordHash,
      role: 'SYSADMIN',
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'duena@barbynails.com' },
    create: {
      email: 'duena@barbynails.com',
      passwordHash,
      role: 'OWNER',
    },
    update: {},
  });

  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      salonName: 'Barby Nails & Spa',
      logoUrl: null,
    },
    update: {},
  });

  console.log('Seed OK:', {
    category: category.id,
    service: service.id,
    professional: professional.id,
    sysadmin: { email: 'sysadmin@barbynails.com', password: 'sysadmin123' },
    login: { email: 'duena@barbynails.com', password: 'admin123' },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
