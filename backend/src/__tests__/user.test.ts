import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

jest.setTimeout(30000);

const TEST_EMAIL = 'usertest@example.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'User Test';

async function cleanupUser() {
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
}

async function registerAndLogin() {
  await request(app).post('/api/auth/register').send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    displayName: TEST_NAME,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  return res.body as { accessToken: string; user: { id: string } };
}

beforeEach(cleanupUser);
afterAll(async () => {
  await cleanupUser();
  await prisma.$disconnect();
});

// ─── GET /api/users/me ────────────────────────────────────────────────────────

describe('GET /api/users/me', () => {
  it('returns 200 with user profile', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: TEST_EMAIL, displayName: TEST_NAME });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

describe('PATCH /api/users/me', () => {
  it('updates displayName', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Updated Name');
  });

  it('updates timezone', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.user.timezone).toBe('America/New_York');
  });

  it('updates both displayName and timezone', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 'New Name', timezone: 'Europe/London' });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('New Name');
    expect(res.body.user.timezone).toBe('Europe/London');
  });

  it('returns 400 when no fields provided', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when displayName is not a string', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: 123 });

    expect(res.status).toBe(400);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).patch('/api/users/me').send({ displayName: 'Name' });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/users/me ─────────────────────────────────────────────────────

describe('DELETE /api/users/me', () => {
  it('returns 204 and removes the user', async () => {
    const { accessToken, user } = await registerAndLogin();

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(dbUser).toBeNull();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('invalidates access after deletion (subsequent request returns 401 or 404)', async () => {
    const { accessToken } = await registerAndLogin();

    await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    // Access token is still cryptographically valid but user is gone
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
