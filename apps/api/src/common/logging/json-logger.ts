import { LoggerService } from '@nestjs/common';

type Level = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

/**
 * Structured JSON logger (spec §55). Never pass passwords, tokens or
 * financial amounts into log metadata.
 */
export class JsonLogger implements LoggerService {
  private write(level: Level, message: unknown, context?: string, extra?: Record<string, unknown>) {
    const entry: Record<string, unknown> = {
      time: new Date().toISOString(),
      level,
      service: context ?? 'app',
      ...(typeof message === 'object' && message !== null ? (message as object) : { message }),
      ...extra,
    };
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
    else process.stdout.write(line + '\n');
  }

  log(message: unknown, context?: string) {
    this.write('info', message, context);
  }
  error(message: unknown, trace?: string, context?: string) {
    this.write('error', message, context, trace ? { trace } : undefined);
  }
  warn(message: unknown, context?: string) {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string) {
    this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string) {
    this.write('verbose', message, context);
  }
}
