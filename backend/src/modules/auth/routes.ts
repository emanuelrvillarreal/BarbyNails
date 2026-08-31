import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../lib/prisma';

const router = Router();

// Frena fuerza bruta de contraseña: 8 intentos cada 10 min por IP. No cuenta
// los logins exitosos, para no penalizar el uso normal.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos fallidos. Esperá unos minutos y probá de nuevo.' },
});

// Mas restrictivo todavia: no hay motivo legitimo para pedir el blanqueo de
// la misma cuenta muchas veces seguidas.
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Esperá un rato y probá de nuevo.' },
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, professionalId: user.professionalId },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' },
    );

    res.json({ token, role: user.role, professionalId: user.professionalId });
  } catch (err) {
    next(err);
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Endpoint de solicitud de blanqueo de contraseña. Responde SIEMPRE el mismo
// mensaje exista o no la cuenta (incluso si esta inactiva) - de lo contrario
// alguien podria usar este endpoint para averiguar que emails estan
// registrados en el sistema segun la respuesta que reciba.
const FORGOT_PASSWORD_MESSAGE =
  'Si el email está registrado, la administración o el SysAdmin van a poder restablecer tu contraseña. Comunicate con ellos para coordinarlo.';

router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
  try {
    forgotPasswordSchema.parse(req.body);
    res.json({ message: FORGOT_PASSWORD_MESSAGE });
  } catch (err) {
    next(err);
  }
});

export default router;
