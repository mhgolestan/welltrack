import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { signAccessToken, generateRefreshToken, hashToken } from '../lib/jwt';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const PASSWORD_RESET_EXPIRY_MINUTES = 60;

// ─── Register ────────────────────────────────────────────────────────────────

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
  const user = await prisma.user.create({ data: { email, passwordHash, displayName } });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const { raw: refreshRaw, hash: refreshHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: refreshHash, expiresAt },
  });

  res.status(201).json({
    accessToken,
    refreshToken: refreshRaw,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
  });
}

// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const { raw: refreshRaw, hash: refreshHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: refreshHash, expiresAt },
  });

  res.json({
    accessToken,
    refreshToken: refreshRaw,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: user.timezone,
      createdAt: user.createdAt,
    },
  });
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt < new Date()) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  // Rotate: delete old token, issue new pair
  await prisma.refreshToken.delete({ where: { tokenHash } });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const { raw: newRaw, hash: newHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: newHash, expiresAt },
  });

  res.json({ accessToken, refreshToken: newRaw });
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== 'string') {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });

  res.status(204).send();
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond 200 to avoid leaking whether an email exists
  if (!user) {
    res.json({ message: 'If that email exists, a reset link has been sent' });
    return;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  const expiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry },
  });

  // In production this would send an email; for dev we log the token
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[DEV] Password reset token for ${email}: ${rawToken}`);
  }

  res.json({ message: 'If that email exists, a reset link has been sent' });
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({ error: 'token and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'password must be at least 8 characters' });
    return;
  }

  const hashedToken = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
  });

  // Invalidate all refresh tokens on password reset
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  res.json({ message: 'Password reset successful' });
}
