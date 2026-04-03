import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma';
import { signAccessToken } from '../lib/jwt';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'email, password, and displayName are required' });
    return;
  }

  if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
    res.status(400).json({ error: 'email, password, and displayName must be strings' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { email, passwordHash, displayName },
  });

  const token = signAccessToken({ userId: user.id, email: user.email });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
  });
}
