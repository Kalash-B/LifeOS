import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { EventEmitter } from 'node:events';

/** Core domain events (spec §57). Modules publish; notifications/analytics subscribe. */
export type DomainEvent =
  | { type: 'ROUTINE_COMPLETED'; userId: string; routineItemId: string; date: string }
  | { type: 'HABIT_COMPLETED'; userId: string; habitId: string; habitName: string; date: string }
  | { type: 'WORKOUT_COMPLETED'; userId: string; workoutId: string }
  | { type: 'LEARNING_SESSION_COMPLETED'; userId: string; sessionId: string; minutes: number }
  | { type: 'TASK_COMPLETED'; userId: string; taskId: string; projectId: string }
  | { type: 'PROJECT_COMPLETED'; userId: string; projectId: string; projectName: string }
  | { type: 'EXPENSE_CREATED'; userId: string; expenseId: string }
  | { type: 'INCOME_CREATED'; userId: string; incomeId: string }
  | { type: 'SAVINGS_MILESTONE'; userId: string; goalId: string; goalName: string; percent: number };

export type DomainEventType = DomainEvent['type'];
type Handler<T extends DomainEventType> = (event: Extract<DomainEvent, { type: T }>) => unknown;

/**
 * In-process event bus. Handlers run asynchronously after the request's write
 * has committed, so a failing subscriber never fails the originating request.
 */
@Injectable()
export class DomainEvents {
  private readonly emitter = new EventEmitter();
  private readonly logger = new Logger('events');

  publish(event: DomainEvent) {
    setImmediate(() => this.emitter.emit(event.type, event));
  }

  subscribe<T extends DomainEventType>(type: T, handler: Handler<T>) {
    this.emitter.on(type, (event) => {
      Promise.resolve()
        .then(() => handler(event))
        .catch((error: unknown) =>
          this.logger.error({ operation: `handle:${type}`, userId: event.userId, error: String(error) }),
        );
    });
  }
}

@Global()
@Module({ providers: [DomainEvents], exports: [DomainEvents] })
export class DomainEventsModule {}
