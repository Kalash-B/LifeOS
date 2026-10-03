import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { environment } from '../../config/environment.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { Public } from './auth.guard.js';
import { AuthService, type IssuedSession } from './auth.service.js';

export const REFRESH_COOKIE = 'lifeos_rt';
/** Non-secret marker readable by the web app's proxy for optimistic redirects. */
export const SESSION_HINT_COOKIE = 'lifeos_session';

const authLimit = { default: { limit: environment.authRateLimitPerMinute, ttl: 60_000 } };
// Refresh runs on every page load, so it gets a looser limit than credential checks.
const refreshLimit = { default: { limit: Math.max(60, environment.authRateLimitPerMinute), ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(authLimit)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.register(dto, req.headers['user-agent']));
  }

  @Public()
  @Throttle(authLimit)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(dto, req.headers['user-agent']));
  }

  @Public()
  @Throttle(refreshLimit)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.respond(res, await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], req.headers['user-agent']));
    } catch (error) {
      this.clearCookies(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
    return { loggedOut: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private respond(res: Response, session: IssuedSession) {
    // Without "Keep me logged in" the cookies have no expiry, so the browser drops them on close.
    const base = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: environment.isProduction,
      ...(session.persistent ? { expires: session.refreshExpiresAt } : {}),
    };
    res.cookie(REFRESH_COOKIE, session.refreshToken, { ...base, path: '/api/v1/auth' });
    res.cookie(SESSION_HINT_COOKIE, '1', { ...base, path: '/' });
    return { user: session.user, accessToken: session.accessToken, tokenType: 'Bearer', expiresIn: session.expiresIn };
  }

  private clearCookies(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.clearCookie(SESSION_HINT_COOKIE, { path: '/' });
  }
}
