import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export interface TestUser {
  email: string;
  password: string;
  token: string;
  cookies: string[];
  id: string;
}

export async function registerUser(app: INestApplication, label: string, timezone = 'Asia/Kolkata'): Promise<TestUser> {
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = 'Password123!';
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ email, password, displayName: label, timezone })
    .expect(201);
  return {
    email,
    password,
    token: response.body.data.accessToken,
    cookies: ([] as string[]).concat(response.headers['set-cookie'] ?? []),
    id: response.body.data.user.id,
  };
}

/** Authenticated request helper: api(app, user).get('/habits') */
export function api(app: INestApplication, user: TestUser) {
  const server = app.getHttpServer();
  const withAuth = (req: request.Test) => req.set('Authorization', `Bearer ${user.token}`);
  return {
    get: (path: string) => withAuth(request(server).get(`/api/v1${path}`)),
    post: (path: string) => withAuth(request(server).post(`/api/v1${path}`)),
    patch: (path: string) => withAuth(request(server).patch(`/api/v1${path}`)),
    put: (path: string) => withAuth(request(server).put(`/api/v1${path}`)),
    delete: (path: string) => withAuth(request(server).delete(`/api/v1${path}`)),
  };
}

/** Local date key in a timezone, mirroring the server's logic. */
export function todayIn(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
