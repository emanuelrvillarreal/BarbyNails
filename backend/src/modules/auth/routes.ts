import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res, next) => {
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

// Endpoint de solicitud de blanqueo de contraseña
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      // Respondemos OK por seguridad para no revelar existencia de emails
      return res.json({ message: 'Si el email está registrado, se han enviado las instrucciones.' });
    }

    res.json({
      message: 'Solicitud recibida. Comunicate con la administración o SysAdmin para restablecer tu contraseña.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
