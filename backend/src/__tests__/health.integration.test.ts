import http from 'http';
import request from 'supertest';
import app from '../app';

describe('Health endpoint (integration)', () => {
  let server: http.Server;

  beforeAll((done) => {
    server = app.listen(0, done); // port 0 = OS picks a free port
  });

  afterAll((done) => {
    server.close(done);
  });

  it('responds to GET /health on a live server', async () => {
    const res = await request(server).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
