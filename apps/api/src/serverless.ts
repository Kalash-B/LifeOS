import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './bootstrap.js';

type RequestListener = (req: IncomingMessage, res: ServerResponse) => void;

// One Nest app per function instance, reused across requests (Fluid compute keeps instances warm).
let listener: Promise<RequestListener> | undefined;

async function init(): Promise<RequestListener> {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as RequestListener;
}

/** Vercel Function handler: forwards every request to the Nest/Express app. */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  listener ??= init().catch((error: unknown) => {
    listener = undefined; // let the next request retry a failed cold start
    throw error;
  });
  (await listener)(req, res);
}
