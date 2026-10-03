import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { api, createApp, registerUser } from './utils.js';

const cookieValue = (cookies: string[], name: string) =>
  cookies.find((cookie) => cookie.startsWith(`${name}=`))?.split(';')[0];

describe('Auth', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createApp()));
  afterAll(() => app.close());

  it('registers, returns the envelope, and never exposes the password hash', async () => {
    const user = await registerUser(app, 'auth');
    const me = await api(app, user).get('/auth/me').expect(200);
    expect(me.body.success).toBe(true);
    expect(me.body.data.email).toBe(user.email);
    expect(me.body.data.timezone).toBe('Asia/Kolkata');
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
    // refresh token is httpOnly and scoped to the auth path
    const refresh = user.cookies.find((cookie) => cookie.startsWith('lifeos_rt='))!;
    expect(refresh).toMatch(/HttpOnly/i);
    expect(refresh).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('rejects duplicate registration and wrong passwords with generic errors', async () => {
    const user = await registerUser(app, 'dup');
    const server = app.getHttpServer();
    const dup = await request(server).post('/api/v1/auth/register').send({ email: user.email, password: 'Password123!' }).expect(409);
    expect(dup.body).toMatchObject({ success: false, error: { code: 'CONFLICT' } });
    const bad = await request(server).post('/api/v1/auth/login').send({ email: user.email, password: 'wrong-password' }).expect(401);
    const unknown = await request(server).post('/api/v1/auth/login').send({ email: 'nobody@example.test', password: 'wrong-password' }).expect(401);
    expect(bad.body.error.message).toBe(unknown.body.error.message);
  });

  it('logs in with a case-insensitive email', async () => {
    const user = await registerUser(app, 'case');
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email.toUpperCase(), password: user.password })
      .expect(200);
    expect(response.body.data.accessToken).toBeTruthy();
  });

  it('rotates refresh tokens and revokes everything when an old token is replayed', async () => {
    const user = await registerUser(app, 'rotate');
    const server = app.getHttpServer();
    const original = cookieValue(user.cookies, 'lifeos_rt')!;

    const first = await request(server).post('/api/v1/auth/refresh').set('Cookie', original).expect(200);
    const rotated = cookieValue(first.headers['set-cookie'] as unknown as string[], 'lifeos_rt')!;
    expect(rotated).not.toBe(original);
    expect(first.body.data.accessToken).toBeTruthy();

    // Replaying the original token is treated as theft…
    await request(server).post('/api/v1/auth/refresh').set('Cookie', original).expect(401);
    // …which also kills the legitimately rotated session.
    await request(server).post('/api/v1/auth/refresh').set('Cookie', rotated).expect(401);
  });

  it('logout revokes the refresh session', async () => {
    const user = await registerUser(app, 'logout');
    const server = app.getHttpServer();
    const token = cookieValue(user.cookies, 'lifeos_rt')!;
    await request(server).post('/api/v1/auth/logout').set('Cookie', token).expect(200);
    await request(server).post('/api/v1/auth/refresh').set('Cookie', token).expect(401);
  });

  it('rejects unauthenticated and forged requests', async () => {
    const server = app.getHttpServer();
    const response = await request(server).get('/api/v1/habits').expect(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
    await request(server).get('/api/v1/habits').set('Authorization', 'Bearer not-a-real-token').expect(401);
    await request(server).get('/api/v1/health').expect(200);
  });

  it('returns validation errors in the error envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('"Keep me logged in" sets a persistent cookie; unchecked gives a browser-session cookie, kept across rotation', async () => {
    const user = await registerUser(app, 'remember');
    const server = app.getHttpServer();
    const refreshCookie = (cookies: string[]) => cookies.find((cookie) => cookie.startsWith('lifeos_rt='))!;

    const remembered = await request(server).post('/api/v1/auth/login').send({ email: user.email, password: user.password, rememberMe: true }).expect(200);
    expect(refreshCookie(remembered.headers['set-cookie'] as unknown as string[])).toMatch(/Expires=/);

    const transient = await request(server).post('/api/v1/auth/login').send({ email: user.email, password: user.password, rememberMe: false }).expect(200);
    const transientCookie = refreshCookie(transient.headers['set-cookie'] as unknown as string[]);
    expect(transientCookie).not.toMatch(/Expires=/);

    const rotated = await request(server).post('/api/v1/auth/refresh').set('Cookie', transientCookie.split(';')[0]).expect(200);
    expect(refreshCookie(rotated.headers['set-cookie'] as unknown as string[])).not.toMatch(/Expires=/);
  });
});
