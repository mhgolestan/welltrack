import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app';
import prisma from '../lib/prisma';

// Clean up test users after each test
afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  const validPayload = {
    email: 'alice@test.com',
    password: 'password123',
    displayName: 'Alice',
  };

  it('creates a user and returns 201 with a JWT and user object', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      email: 'alice@test.com',
      displayName: 'Alice',
      timezone: 'UTC',
    });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('stores a bcrypt hash, not the plain password', async () => {
    await request(app).post('/api/auth/register').send(validPayload);

    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });
    expect(user).not.toBeNull();
    const matches = await bcrypt.compare(validPayload.password, user!.passwordHash);
    expect(matches).toBe(true);
  });

  it('returns 409 when email is already registered', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'password123', displayName: 'Alice' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', displayName: 'Alice' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when displayName is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@test.com', password: 'short', displayName: 'Alice' });

    expect(res.status).toBe(400);
  });
});
