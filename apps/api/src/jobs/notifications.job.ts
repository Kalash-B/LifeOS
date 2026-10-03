import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { environment } from '../config/environment.js';
import { RemindersGenerator } from './reminders.generator.js';

const QUEUE = 'lifeos-notifications';
const TICK = 'reminder-tick';

/**
 * Redis-backed notification worker (spec §30). A repeatable BullMQ job fires
 * every minute; BullMQ guarantees a single execution per tick even with
 * multiple API replicas.
 */
@Injectable()
export class NotificationsJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('jobs');
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly reminders: RemindersGenerator) {}

  async onApplicationBootstrap() {
    if (!environment.jobsEnabled) return;
    const connection = { url: environment.redisUrl, maxRetriesPerRequest: null };
    try {
      this.queue = new Queue(QUEUE, { connection });
      await this.queue.upsertJobScheduler(TICK, { every: 60_000 }, { name: TICK, opts: { removeOnComplete: 100, removeOnFail: 100 } });
      this.worker = new Worker(QUEUE, async () => ({ delivered: await this.reminders.run() }), { connection, concurrency: 1 });
      this.worker.on('failed', (job, error) =>
        this.logger.error({ operation: 'reminder-tick', jobId: job?.id, error: error.message }),
      );
      this.logger.log({ operation: 'start', queue: QUEUE, every: '60s' });
    } catch (error) {
      // The API keeps serving if Redis is unavailable; reminders resume on restart.
      this.logger.error({ operation: 'start', error: String(error) });
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
