import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── GET /api/users/me ────────────────────────────────────────────────────────

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, timezone: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
}

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { displayName, timezone } = req.body;

  if (displayName !== undefined && typeof displayName !== 'string') {
    res.status(400).json({ error: 'displayName must be a string' });
    return;
  }

  if (timezone !== undefined && typeof timezone !== 'string') {
    res.status(400).json({ error: 'timezone must be a string' });
    return;
  }

  if (displayName === undefined && timezone === undefined) {
    res.status(400).json({ error: 'at least one of displayName or timezone is required' });
    return;
  }

  const data: { displayName?: string; timezone?: string } = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (timezone !== undefined) data.timezone = timezone;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, displayName: true, timezone: true, createdAt: true },
  });

  res.json({ user });
}

// ─── DELETE /api/users/me ─────────────────────────────────────────────────────

export async function deleteMe(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  await prisma.user.delete({ where: { id: userId } });

  res.status(204).send();
}
