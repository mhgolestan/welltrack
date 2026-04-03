import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

jest.setTimeout(30000);

const TEST_EMAIL = 'symptomtest@example.com';
const TEST_PASSWORD = 'password123';
const TEST_NAME = 'Symptom Test User';

const TEST_EMAIL_2 = 'symptomtest2@example.com';

async function cleanupUsers() {
  await prisma.user.deleteMany({ where: { email: { in: [TEST_EMAIL, TEST_EMAIL_2] } } });
}

async function registerAndLogin(email = TEST_EMAIL) {
  await request(app).post('/api/auth/register').send({
    email,
    password: TEST_PASSWORD,
    displayName: TEST_NAME,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: TEST_PASSWORD });
  return res.body as { accessToken: string; user: { id: string } };
}

// Find a seeded system symptom ID to use in tests
async function getSystemSymptomId(): Promise<string> {
  const s = await prisma.symptom.findFirst({ where: { userId: null } });
  return s!.id;
}

beforeEach(cleanupUsers);
afterAll(async () => {
  await cleanupUsers();
  await prisma.$disconnect();
});

// ─── GET /api/symptoms ────────────────────────────────────────────────────────

describe('GET /api/symptoms', () => {
  it('returns 200 with system symptoms included', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .get('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.symptoms)).toBe(true);
    expect(res.body.symptoms.length).toBeGreaterThan(0);
    // Should include at least one system symptom (userId null)
    const system = res.body.symptoms.find((s: { userId: string | null }) => s.userId === null);
    expect(system).toBeDefined();
  });

  it('includes user custom symptoms', async () => {
    const { accessToken } = await registerAndLogin();

    await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'MySymptom', category: 'custom' });

    const res = await request(app)
      .get('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    const custom = res.body.symptoms.find((s: { name: string }) => s.name === 'MySymptom');
    expect(custom).toBeDefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/symptoms');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/symptoms ───────────────────────────────────────────────────────

describe('POST /api/symptoms', () => {
  it('returns 201 with created symptom', async () => {
    const { accessToken, user } = await registerAndLogin();

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'CustomPain', category: 'pain' });

    expect(res.status).toBe(201);
    expect(res.body.symptom).toMatchObject({ name: 'CustomPain', category: 'pain', userId: user.id });
  });

  it('returns 400 when name is missing', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ category: 'pain' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when category is missing', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'CustomPain' });

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/symptoms').send({ name: 'X', category: 'Y' });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/symptoms/:id ──────────────────────────────────────────────────

describe('PATCH /api/symptoms/:id', () => {
  it('returns 200 and updates own symptom', async () => {
    const { accessToken } = await registerAndLogin();
    const created = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Old', category: 'general' });

    const id = created.body.symptom.id;

    const res = await request(app)
      .patch(`/api/symptoms/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'New', isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.symptom.name).toBe('New');
    expect(res.body.symptom.isActive).toBe(false);
  });

  it('returns 403 on system symptom', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const res = await request(app)
      .patch(`/api/symptoms/${systemId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
  });

  it('returns 404 on unknown id', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/symptoms/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });

  it('returns 400 when no fields provided', async () => {
    const { accessToken } = await registerAndLogin();
    const created = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Test', category: 'pain' });

    const res = await request(app)
      .patch(`/api/symptoms/${created.body.symptom.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/symptoms/some-id').send({ name: 'X' });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/symptoms/:id ─────────────────────────────────────────────────

describe('DELETE /api/symptoms/:id', () => {
  it('returns 204 and removes own symptom', async () => {
    const { accessToken } = await registerAndLogin();
    const created = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'ToDelete', category: 'test' });

    const id = created.body.symptom.id;

    const res = await request(app)
      .delete(`/api/symptoms/${id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);

    const inDb = await prisma.symptom.findUnique({ where: { id } });
    expect(inDb).toBeNull();
  });

  it('returns 403 on system symptom', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const res = await request(app)
      .delete(`/api/symptoms/${systemId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 on unknown id', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .delete('/api/symptoms/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).delete('/api/symptoms/some-id');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/symptom-logs ────────────────────────────────────────────────────

describe('GET /api/symptom-logs', () => {
  it('returns 200 with logs and symptom info', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId, severity: 5 });

    const res = await request(app)
      .get('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.length).toBeGreaterThan(0);
    expect(res.body.logs[0]).toHaveProperty('symptom');
    expect(res.body).toHaveProperty('total');
  });

  it('filters by startDate and endDate', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId, severity: 3, loggedAt: '2020-01-01T00:00:00Z' });

    const res = await request(app)
      .get('/api/symptom-logs?startDate=2021-01-01&endDate=2021-12-31')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(0);
  });

  it('respects limit and offset', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/symptom-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ symptomId: systemId, severity: i + 1 });
    }

    const res = await request(app)
      .get('/api/symptom-logs?limit=2&offset=0')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.logs.length).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.total).toBe(3);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/symptom-logs');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/symptom-logs ───────────────────────────────────────────────────

describe('POST /api/symptom-logs', () => {
  it('returns 201 with created log', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId, severity: 7, notes: 'test note' });

    expect(res.status).toBe(201);
    expect(res.body.log.severity).toBe(7);
    expect(res.body.log.notes).toBe('test note');
    expect(res.body.log.symptom).toBeDefined();
  });

  it('returns 400 when severity is out of range', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId, severity: 11 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is missing', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId });

    expect(res.status).toBe(400);
  });

  it('returns 400 when symptomId is missing', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 5 });

    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/symptom-logs').send({ symptomId: 'x', severity: 5 });
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /api/symptom-logs/:id ─────────────────────────────────────────────

describe('PATCH /api/symptom-logs/:id', () => {
  it('returns 200 and updates own log', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const created = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId, severity: 3 });

    const id = created.body.log.id;

    const res = await request(app)
      .patch(`/api/symptom-logs/${id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 8, notes: 'updated' });

    expect(res.status).toBe(200);
    expect(res.body.log.severity).toBe(8);
    expect(res.body.log.notes).toBe('updated');
  });

  it('returns 403 on another user\'s log', async () => {
    const { accessToken: token1 } = await registerAndLogin(TEST_EMAIL);
    const { accessToken: token2 } = await registerAndLogin(TEST_EMAIL_2);
    const systemId = await getSystemSymptomId();

    const created = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token1}`)
      .send({ symptomId: systemId, severity: 5 });

    const id = created.body.log.id;

    const res = await request(app)
      .patch(`/api/symptom-logs/${id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ severity: 9 });

    expect(res.status).toBe(403);
  });

  it('returns 404 on unknown id', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .patch('/api/symptom-logs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ severity: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/symptom-logs/some-id').send({ severity: 5 });
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/symptom-logs/:id ────────────────────────────────────────────

describe('DELETE /api/symptom-logs/:id', () => {
  it('returns 204 and removes own log', async () => {
    const { accessToken } = await registerAndLogin();
    const systemId = await getSystemSymptomId();

    const created = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ symptomId: systemId, severity: 4 });

    const id = created.body.log.id;

    const res = await request(app)
      .delete(`/api/symptom-logs/${id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);

    const inDb = await prisma.symptomLog.findUnique({ where: { id } });
    expect(inDb).toBeNull();
  });

  it('returns 403 on another user\'s log', async () => {
    const { accessToken: token1 } = await registerAndLogin(TEST_EMAIL);
    const { accessToken: token2 } = await registerAndLogin(TEST_EMAIL_2);
    const systemId = await getSystemSymptomId();

    const created = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token1}`)
      .send({ symptomId: systemId, severity: 5 });

    const id = created.body.log.id;

    const res = await request(app)
      .delete(`/api/symptom-logs/${id}`)
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 on unknown id', async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request(app)
      .delete('/api/symptom-logs/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).delete('/api/symptom-logs/some-id');
    expect(res.status).toBe(401);
  });
});
