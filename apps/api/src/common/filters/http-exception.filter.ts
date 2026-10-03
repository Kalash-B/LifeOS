import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

const STATUS_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
};

/**
 * Converts every error into the spec §27 error envelope. Stack traces and
 * database internals are logged server-side only, never returned.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('http');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: { id: string } }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred.';
    let details: unknown[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const raw = (body as { message?: unknown }).message;
        if (Array.isArray(raw)) {
          message = 'Invalid request';
          details = raw;
        } else if (typeof raw === 'string') {
          message = raw;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with these values already exists.';
      } else if (exception.code === 'P2025' || exception.code === 'P2003') {
        status = HttpStatus.NOT_FOUND;
        message = 'The referenced record was not found.';
      } else if (exception.code === 'P2023') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Malformed identifier.';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid request';
    }

    if (status >= 500) {
      this.logger.error(
        {
          operation: `${request.method} ${request.route?.path ?? request.path}`,
          userId: request.user?.id,
          error: exception instanceof Error ? exception.message : String(exception),
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      error: {
        code: STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'ERROR'),
        message,
        details,
      },
    });
  }
}
