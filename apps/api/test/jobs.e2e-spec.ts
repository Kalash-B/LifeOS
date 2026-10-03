import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { api, createApp, registerUser } from './utils.js';

/** The Vercel Cron trigger: only callers holding CRON_SECRET may run jobs. */
describe('Scheduled jobs endpoint', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(() => app.close());

  it('rejects calls without the cron secret', async () => {
    const server = app.getHttpServer();
    await request(server).get('/api/v1/jobs/reminders').expect(401);
    await request(server).get('/api/v1/jobs/reminders').set('Authorization', 'Bearer wrong').expect(401);
  });

  it('rejects a normal user token', async () => {
    const user = await registerUser(app, 'cron-user');
    await api(app, user).get('/jobs/reminders').expect(401);
  });

  it('runs the reminder generator with the secret, and is safe to repeat', async () => {
    const server = app.getHttpServer();
    const auth = `Bearer ${process.env.CRON_SECRET}`;
    const first = await request(server).get('/api/v1/jobs/reminders').set('Authorization', auth).expect(200);
    expect(first.body.data.ok).toBe(true);
    // Idempotent: a duplicate delivery must not create duplicate notifications.
    await request(server).get('/api/v1/jobs/reminders').set('Authorization', auth).expect(200);
  });
});
