import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { addDays, dateKeyToDate, dateKeysBetween, dateToKey, localDateKey } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateRoutineDto,
  CreateRoutineItemDto,
  LogRoutineItemDto,
  UpdateRoutineDto,
  UpdateRoutineItemDto,
} from './routine.dto.js';
import { occursOn } from './routine.recurrence.js';

const itemOrder = [{ startTime: { sort: 'asc', nulls: 'last' } }, { position: 'asc' }] as const;

@Injectable()
export class RoutineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly events: DomainEvents,
  ) {}

  list(userId: string) {
    return this.prisma.routine.findMany({
      where: { userId },
      include: { routineItems: { orderBy: [...itemOrder] } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async get(id: string, userId: string) {
    const routine = await this.prisma.routine.findFirst({
      where: { id, userId },
      include: { routineItems: { orderBy: [...itemOrder] } },
    });
    if (!routine) throw new NotFoundException('Routine not found.');
    return routine;
  }

  create(dto: CreateRoutineDto, userId: string) {
    return this.prisma.routine.create({ data: { ...dto, userId }, include: { routineItems: true } });
  }

  async update(id: string, dto: UpdateRoutineDto, userId: string) {
    await this.get(id, userId);
    return this.prisma.routine.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    await this.get(id, userId);
    await this.prisma.routine.delete({ where: { id } });
    return { deleted: true };
  }

  async createItem(routineId: string, dto: CreateRoutineItemDto, userId: string) {
    await this.get(routineId, userId);
    this.assertTimeRange(dto.startTime, dto.endTime);
    const position =
      dto.position ?? (await this.prisma.routineItem.count({ where: { routineId } }));
    return this.prisma.routineItem.create({ data: { ...dto, position, routineId } });
  }

  async updateItem(itemId: string, dto: UpdateRoutineItemDto, userId: string) {
    const item = await this.getOwnedItem(itemId, userId);
    this.assertTimeRange(dto.startTime ?? item.startTime, dto.endTime ?? item.endTime);
    return this.prisma.routineItem.update({ where: { id: itemId }, data: dto });
  }

  async removeItem(itemId: string, userId: string) {
    await this.getOwnedItem(itemId, userId);
    await this.prisma.routineItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async logItem(itemId: string, dto: LogRoutineItemDto, userId: string) {
    await this.getOwnedItem(itemId, userId);
    const date = dateKeyToDate(dto.date);
    const completedAt = dto.status === 'COMPLETED' ? new Date() : null;
    const log = await this.prisma.routineLog.upsert({
      where: { routineItemId_date: { routineItemId: itemId, date } },
      update: { status: dto.status, completedAt, notes: dto.notes },
      create: { routineItemId: itemId, userId, date, status: dto.status, completedAt, notes: dto.notes },
    });
    if (dto.status === 'COMPLETED') {
      this.events.publish({ type: 'ROUTINE_COMPLETED', userId, routineItemId: itemId, date: dto.date });
    }
    return log;
  }

  /** Items scheduled on a local date across active routines, with their log status. */
  async day(userId: string, dateKey?: string) {
    const date = dateKey ?? (await this.clock.today(userId)).today;
    const routines = await this.prisma.routine.findMany({
      where: { userId, isActive: true },
      include: {
        routineItems: {
          orderBy: [...itemOrder],
          include: { routineLogs: { where: { date: dateKeyToDate(date) } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const items = routines
      .flatMap((routine) =>
        routine.routineItems
          .filter((item) => occursOn(item.recurrenceRule, date))
          .map(({ routineLogs, ...item }) => ({
            ...item,
            routineName: routine.name,
            status: routineLogs[0]?.status ?? 'PENDING',
            completedAt: routineLogs[0]?.completedAt ?? null,
          })),
      )
      .sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'));

    const completed = items.filter((item) => item.status === 'COMPLETED').length;
    return {
      date,
      items,
      total: items.length,
      completed,
      completionRate: items.length ? Math.round((completed / items.length) * 100) : 0,
    };
  }

  /** Daily completion rates for the last N days. */
  async history(userId: string, days = 30) {
    const { today, timezone } = await this.clock.today(userId);
    const from = addDays(today, -(days - 1));
    const [items, logs] = await Promise.all([
      this.prisma.routineItem.findMany({
        where: { routine: { userId, isActive: true } },
        select: { id: true, recurrenceRule: true, createdAt: true },
      }),
      this.prisma.routineLog.findMany({
        where: { userId, status: 'COMPLETED', date: { gte: dateKeyToDate(from), lte: dateKeyToDate(today) } },
        select: { date: true },
      }),
    ]);
    const completedByDay = new Map<string, number>();
    for (const log of logs) {
      const key = dateToKey(log.date);
      completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
    }
    return dateKeysBetween(from, today).map((date) => {
      const scheduled = items.filter(
        (item) => localDateKey(item.createdAt, timezone) <= date && occursOn(item.recurrenceRule, date),
      ).length;
      const completed = completedByDay.get(date) ?? 0;
      return { date, scheduled, completed, rate: scheduled ? Math.min(100, Math.round((completed / scheduled) * 100)) : 0 };
    });
  }

  private async getOwnedItem(itemId: string, userId: string) {
    const item = await this.prisma.routineItem.findFirst({ where: { id: itemId, routine: { userId } } });
    if (!item) throw new NotFoundException('Routine item not found.');
    return item;
  }

  private assertTimeRange(start?: string | null, end?: string | null) {
    if (start && end && end <= start) throw new BadRequestException('endTime must be after startTime.');
  }
}
