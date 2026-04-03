import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── GET /api/symptoms ────────────────────────────────────────────────────────

export async function getSymptoms(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const symptoms = await prisma.symptom.findMany({
    where: { OR: [{ userId: null }, { userId }] },
    orderBy: [{ userId: 'asc' }, { name: 'asc' }],
  });

  res.json({ symptoms });
}

// ─── POST /api/symptoms ───────────────────────────────────────────────────────

export async function createSymptom(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { name, category } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name is required and must be a string' });
    return;
  }

  if (!category || typeof category !== 'string') {
    res.status(400).json({ error: 'category is required and must be a string' });
    return;
  }

  const symptom = await prisma.symptom.create({
    data: { userId, name, category },
  });

  res.status(201).json({ symptom });
}

// ─── PATCH /api/symptoms/:id ──────────────────────────────────────────────────

export async function updateSymptom(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const { name, category, isActive } = req.body;

  const symptom = await prisma.symptom.findUnique({ where: { id } });

  if (!symptom) {
    res.status(404).json({ error: 'Symptom not found' });
    return;
  }

  if (symptom.userId !== userId) {
    res.status(403).json({ error: 'Cannot modify this symptom' });
    return;
  }

  if (name === undefined && category === undefined && isActive === undefined) {
    res.status(400).json({ error: 'at least one of name, category, or isActive is required' });
    return;
  }

  if (name !== undefined && typeof name !== 'string') {
    res.status(400).json({ error: 'name must be a string' });
    return;
  }

  if (category !== undefined && typeof category !== 'string') {
    res.status(400).json({ error: 'category must be a string' });
    return;
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive must be a boolean' });
    return;
  }

  const data: { name?: string; category?: string; isActive?: boolean } = {};
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (isActive !== undefined) data.isActive = isActive;

  const updated = await prisma.symptom.update({ where: { id }, data });

  res.json({ symptom: updated });
}

// ─── DELETE /api/symptoms/:id ─────────────────────────────────────────────────

export async function deleteSymptom(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const symptom = await prisma.symptom.findUnique({ where: { id } });

  if (!symptom) {
    res.status(404).json({ error: 'Symptom not found' });
    return;
  }

  if (symptom.userId === null) {
    res.status(403).json({ error: 'Cannot delete system symptoms' });
    return;
  }

  if (symptom.userId !== userId) {
    res.status(403).json({ error: 'Cannot delete this symptom' });
    return;
  }

  await prisma.symptom.delete({ where: { id } });

  res.status(204).send();
}

// ─── GET /api/symptom-logs ────────────────────────────────────────────────────

export async function getSymptomLogs(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { startDate, endDate } = req.query;
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
  const offset = parseInt(String(req.query.offset ?? '0'), 10) || 0;

  const loggedAtFilter: { gte?: Date; lte?: Date } = {};
  if (typeof startDate === 'string') loggedAtFilter.gte = new Date(startDate);
  if (typeof endDate === 'string') loggedAtFilter.lte = new Date(endDate);

  const hasDateFilter = typeof startDate === 'string' || typeof endDate === 'string';
  const where = {
    userId,
    ...(hasDateFilter ? { loggedAt: loggedAtFilter } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.symptomLog.findMany({
      where,
      include: { symptom: { select: { id: true, name: true, category: true } } },
      orderBy: { loggedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.symptomLog.count({ where }),
  ]);

  res.json({ logs, total, limit, offset });
}

// ─── POST /api/symptom-logs ───────────────────────────────────────────────────

export async function createSymptomLog(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { symptomId, severity, notes, loggedAt } = req.body;

  if (!symptomId || typeof symptomId !== 'string') {
    res.status(400).json({ error: 'symptomId is required and must be a string' });
    return;
  }

  if (severity === undefined || typeof severity !== 'number' || !Number.isInteger(severity) || severity < 1 || severity > 10) {
    res.status(400).json({ error: 'severity is required and must be an integer between 1 and 10' });
    return;
  }

  const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });

  if (!symptom || (symptom.userId !== null && symptom.userId !== userId)) {
    res.status(400).json({ error: 'Invalid symptomId' });
    return;
  }

  const log = await prisma.symptomLog.create({
    data: {
      userId,
      symptomId,
      severity,
      notes: notes ?? null,
      loggedAt: loggedAt ? new Date(loggedAt) : undefined,
    },
    include: { symptom: { select: { id: true, name: true, category: true } } },
  });

  res.status(201).json({ log });
}

// ─── PATCH /api/symptom-logs/:id ─────────────────────────────────────────────

export async function updateSymptomLog(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id as string;
  const { severity, notes, loggedAt } = req.body;

  const existing = await prisma.symptomLog.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ error: 'Symptom log not found' });
    return;
  }

  if (existing.userId !== userId) {
    res.status(403).json({ error: 'Cannot modify this log entry' });
    return;
  }

  if (severity === undefined && notes === undefined && loggedAt === undefined) {
    res.status(400).json({ error: 'at least one of severity, notes, or loggedAt is required' });
    return;
  }

  if (severity !== undefined && (typeof severity !== 'number' || !Number.isInteger(severity) || severity < 1 || severity > 10)) {
    res.status(400).json({ error: 'severity must be an integer between 1 and 10' });
    return;
  }

  const data: { severity?: number; notes?: string | null; loggedAt?: Date } = {};
  if (severity !== undefined) data.severity = severity;
  if (notes !== undefined) data.notes = notes;
  if (loggedAt !== undefined) data.loggedAt = new Date(loggedAt);

  const log = await prisma.symptomLog.update({
    where: { id },
    data,
    include: { symptom: { select: { id: true, name: true, category: true } } },
  });

  res.json({ log });
}

// ─── DELETE /api/symptom-logs/:id ────────────────────────────────────────────

export async function deleteSymptomLog(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const existing = await prisma.symptomLog.findUnique({ where: { id } });

  if (!existing) {
    res.status(404).json({ error: 'Symptom log not found' });
    return;
  }

  if (existing.userId !== userId) {
    res.status(403).json({ error: 'Cannot delete this log entry' });
    return;
  }

  await prisma.symptomLog.delete({ where: { id } });

  res.status(204).send();
}
