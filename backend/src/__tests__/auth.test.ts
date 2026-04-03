import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { hashToken } from '../lib/jwt';

const TEST_EMAIL = 'testuser@example.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Test User';

async function cleanupUser() {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

async function registerUser() {
  return request(app).post('/api/auth/register').send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    displayName: TEST_NAME,
  });
}

beforeEach(cleanupUser);
afterAll(async () => {
  await cleanupUser();
  await prisma.$disconnect();
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 201 with accessToken, refreshToken, and user', async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({ email: TEST_EMAIL, displayName: TEST_NAME });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 on duplicate email', async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: TEST_EMAIL });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL, password: 'short', displayName: TEST_NAME });
    expect(res.status).toBe(400);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => { await registerUser(); });

  it('returns 200 with accessToken, refreshToken, and user on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe(TEST_EMAIL);
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL });
    expect(res.status).toBe(400);
  });
});

// ─── Refresh ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  it('returns new accessToken and rotated refreshToken', async () => {
    const reg = await registerUser();
    const { refreshToken } = reg.body;

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.refreshToken).not.toBe(refreshToken); // rotated
  });

  it('returns 401 when the old refresh token is reused after rotation', async () => {
    const reg = await registerUser();
    const { refreshToken } = reg.body;

    await request(app).post('/api/auth/refresh').send({ refreshToken });

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'bogus' });
    expect(res.status).toBe(401);
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 204 and invalidates the refresh token', async () => {
    const reg = await registerUser();
    const { refreshToken } = reg.body;

    const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    // Token no longer usable
    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(401);
  });

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(400);
  });
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 regardless of whether email exists', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('stores a hashed reset token when email exists', async () => {
    await registerUser();
    await request(app).post('/api/auth/forgot-password').send({ email: TEST_EMAIL });

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user?.passwordResetToken).not.toBeNull();
    expect(user?.passwordResetExpiry).not.toBeNull();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });
});

// ─── Reset Password ───────────────────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  async function setupResetToken() {
    await registerUser();
    const rawToken = 'validresettoken1234567890abcdef';
    const hashedToken = hashToken(rawToken);
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { passwordResetToken: hashedToken, passwordResetExpiry: expiry },
    });
    return rawToken;
  }

  it('resets password and returns 200', async () => {
    const token = await setupResetToken();
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'newpassword123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('clears the reset token after use', async () => {
    const token = await setupResetToken();
    await request(app).post('/api/auth/reset-password').send({ token, password: 'newpassword123' });

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user?.passwordResetToken).toBeNull();
  });

  it('allows login with new password after reset', async () => {
    const token = await setupResetToken();
    await request(app).post('/api/auth/reset-password').send({ token, password: 'newpassword123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'newpassword123' });
    expect(res.status).toBe(200);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'badtoken', password: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is too short', async () => {
    const token = await setupResetToken();
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: 'short' });
    expect(res.status).toBe(400);
  });
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────

describe('requireAuth middleware', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/auth/me-test');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me-test')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  it('passes through with a valid access token', async () => {
    const reg = await registerUser();
    const { accessToken } = reg.body;

    const res = await request(app)
      .get('/api/auth/me-test')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userId');
  });
});
