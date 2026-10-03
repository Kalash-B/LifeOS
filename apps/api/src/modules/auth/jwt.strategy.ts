import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { environment } from '../../config/environment.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: environment.jwtSecret,
      algorithms: ['HS256'],
    });
  }

  validate(payload: { sub: string; email: string; role: string }): AuthUser {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
