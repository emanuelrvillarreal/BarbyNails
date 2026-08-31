import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { AppError } from './lib/errors';
import authRoutes from './modules/auth/routes';
import agendaRoutes from './modules/agenda/routes';
import professionalsRoutes from './modules/professionals/routes';
import clientsRoutes from './modules/clients/routes';
import catalogRoutes from './modules/catalog/routes';
import financeRoutes from './modules/finance/routes';
import attendanceRoutes from './modules/attendance/routes';
import whatsappRoutes from './modules/whatsapp/routes';
import settingsRoutes from './modules/settings/routes';
import usersRoutes from './modules/users/routes';

export const app = express();

// Render (y el proxy de Vercel por delante) reenvian el pedido con X-Forwarded-For;
// sin esto, express-rate-limit ve la IP del proxy en vez de la del usuario real.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
// El limite por defecto de express.json() es 100kb, insuficiente para el logo
// del salon (se guarda como data URL base64 en SystemSettings.logoUrl).
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/professionals', professionalsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Datos invalidos', details: err.issues });
  }
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El archivo es muy pesado. Probá con una imagen mas liviana (menos de 5MB).' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});
