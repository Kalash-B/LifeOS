import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

const IS_PUBLIC = 'isPublic';
const ROLES = 'roles';

/** Opt a route out of authentication. Every other route requires a valid access token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: string[]) => SetMetadata(ROLES, roles);

/** Global guard: authentication by default, plus optional role checks. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const authenticated = (await super.canActivate(context)) as boolean;
    if (!authenticated) return false;

    const roles = this.reflector.getAllAndOverride<string[]>(ROLES, targets);
    if (roles?.length) {
      const user = context.switchToHttp().getRequest().user;
      if (!roles.includes(user?.role)) throw new ForbiddenException('Insufficient permissions.');
    }
    return true;
  }

  handleRequest<TUser>(error: unknown, user: TUser): TUser {
    if (error || !user) throw new UnauthorizedException('Authentication required.');
    return user;
  }
}
