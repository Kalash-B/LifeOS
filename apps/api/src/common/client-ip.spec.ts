import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER, resolveClientIp } from './client-ip.js';

const SECRET = 'proxy-secret-0123456789';

describe('resolveClientIp', () => {
  it('uses the forwarded client IP when the proxy secret matches', () => {
    const req = { ip: '76.76.21.21', headers: { [CLIENT_IP_HEADER]: '203.0.113.7', [PROXY_SECRET_HEADER]: SECRET } };
    expect(resolveClientIp(req, SECRET)).toBe('203.0.113.7');
  });

  it('ignores the header when the secret is wrong or missing (anti-spoofing)', () => {
    expect(resolveClientIp({ ip: '1.1.1.1', headers: { [CLIENT_IP_HEADER]: '9.9.9.9', [PROXY_SECRET_HEADER]: 'guess' } }, SECRET)).toBe('1.1.1.1');
    expect(resolveClientIp({ ip: '1.1.1.1', headers: { [CLIENT_IP_HEADER]: '9.9.9.9' } }, SECRET)).toBe('1.1.1.1');
  });

  it('ignores the header entirely when no proxy secret is configured', () => {
    expect(resolveClientIp({ ip: '1.1.1.1', headers: { [CLIENT_IP_HEADER]: '9.9.9.9', [PROXY_SECRET_HEADER]: '' } }, '')).toBe('1.1.1.1');
  });
});
