import { RateLimitStore } from './rate-limit.js';

describe('RateLimitStore', () => {
  const opts = { limit: 3, windowMs: 60_000 };

  it('allows up to the limit, then blocks until the window resets', () => {
    const store = new RateLimitStore();
    const t = 1_000_000;
    expect([1, 2, 3].map(() => store.hit('login:1.1.1.1', opts, t).allowed)).toEqual([true, true, true]);
    const blocked = store.hit('login:1.1.1.1', opts, t + 1000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(59);
    expect(store.hit('login:1.1.1.1', opts, t + 60_000).allowed).toBe(true);
  });

  it('keeps separate counters per key (visitor and route)', () => {
    const store = new RateLimitStore();
    for (let i = 0; i < 3; i++) store.hit('login:1.1.1.1', opts);
    expect(store.hit('login:1.1.1.1', opts).allowed).toBe(false);
    expect(store.hit('login:2.2.2.2', opts).allowed).toBe(true);
    expect(store.hit('register:1.1.1.1', opts).allowed).toBe(true);
  });
});
