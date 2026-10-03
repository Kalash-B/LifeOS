import { ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { environment } from '../../config/environment.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto, RegisterDto } from './auth.dto.js';

const BCRYPT_ROUNDS = 12;
// Equalizes login timing for unknown emails so accounts can't be enumerated.
const DUMMY_HASH = bcrypt.hashSync('lifeos-timing-equalizer', BCRYPT_ROUNDS);

export interface IssuedSession {
  user: ReturnType<AuthService['toPublicUser']>;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  /** false → the cookie is a browser-session cookie */
  persistent: boolean;
}

const userInclude = { profile: true } as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger('auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  toPublicUser(user: {
    id: string;
    email: string;
    role: string;
    status: string;
    timezone: string;
    createdAt: Date;
    profile: { displayName: string | null; avatarUrl: string | null; bio: string | null } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      timezone: user.timezone,
      createdAt: user.createdAt,
      profile: user.profile
        ? { displayName: user.profile.displayName, avatarUrl: user.profile.avatarUrl, bio: user.profile.bio }
        : null,
    };
  }

  static hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto, userAgent?: string): Promise<IssuedSession> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists.');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        timezone: dto.timezone ?? 'UTC',
        profile: { create: { displayName: dto.displayName?.trim() || dto.email.split('@')[0] } },
        settings: { create: {} },
      },
      include: userInclude,
    });
    return this.issueSession(user, userAgent, true);
  }

  async login(dto: LoginDto, userAgent?: string): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: userInclude });
    const valid = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid || user.status !== 'ACTIVE') {
      this.logger.warn({ operation: 'login', outcome: 'failed' });
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.issueSession(user, userAgent, dto.rememberMe ?? true);
  }

  /**
   * Rotates the refresh token. Presenting an already-rotated token signals
   * theft, so every session for that user is revoked.
   */
  async refresh(refreshToken: string | undefined, userAgent?: string): Promise<IssuedSession> {
    if (!refreshToken) throw new UnauthorizedException('Session expired.');
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: AuthService.hashToken(refreshToken) },
      include: { user: { include: userInclude } },
    });
    if (!session) throw new UnauthorizedException('Session expired.');

    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.logger.warn({ operation: 'refresh', userId: session.userId, outcome: 'reuse-detected' });
      throw new UnauthorizedException('Session expired.');
    }
    if (session.expiresAt <= new Date() || session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session expired.');
    }

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    // Rotation keeps the user's "Keep me logged in" choice; every refresh slides the window.
    return this.issueSession(session.user, userAgent, session.persistent);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { tokenHash: AuthService.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: userInclude });
    if (!user) throw new UnauthorizedException('Authentication required.');
    return this.toPublicUser(user);
  }

  private async issueSession(
    user: Parameters<AuthService['toPublicUser']>[0],
    userAgent: string | undefined,
    persistent: boolean,
  ): Promise<IssuedSession> {
    const refreshToken = randomBytes(48).toString('base64url');
    const ttlMs = persistent ? environment.refreshTokenTtlDays * 86_400_000 : environment.shortSessionTtlHours * 3_600_000;
    const refreshExpiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: AuthService.hashToken(refreshToken),
        persistent,
        userAgent: userAgent?.slice(0, 255),
        expiresAt: refreshExpiresAt,
      },
    });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: environment.accessTokenTtlSeconds },
    );
    return {
      user: this.toPublicUser(user),
      accessToken,
      expiresIn: environment.accessTokenTtlSeconds,
      refreshToken,
      refreshExpiresAt,
      persistent,
    };
  }
}
