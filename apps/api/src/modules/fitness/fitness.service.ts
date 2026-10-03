import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { addDays, localDateKey, localMidnightUtc, startOfWeek } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { estimatedOneRepMax, workoutVolume } from './fitness.calc.js';
import {
  CreateExerciseDto,
  CreateWeightLogDto,
  CreateWorkoutDto,
  UpdateWorkoutDto,
  WorkoutExerciseDto,
} from './fitness.dto.js';

const workoutInclude = {
  workoutExercises: {
    orderBy: { orderIndex: 'asc' },
    include: { exercise: true, workoutSets: { orderBy: { setNumber: 'asc' } } },
  },
} satisfies Prisma.WorkoutInclude;

type WorkoutWithExercises = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;

@Injectable()
export class FitnessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly events: DomainEvents,
  ) {}

  // ─── Weight ───────────────────────────────────────────────────────────────

  async weightLogs(userId: string, days = 180) {
    return this.prisma.weightLog.findMany({
      where: { userId, recordedAt: { gte: new Date(Date.now() - days * 86_400_000) } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  createWeightLog(dto: CreateWeightLogDto, userId: string) {
    return this.prisma.weightLog.create({
      data: {
        userId,
        weight: dto.weight,
        unit: dto.unit ?? 'kg',
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        notes: dto.notes,
      },
    });
  }

  async deleteWeightLog(id: string, userId: string) {
    const { count } = await this.prisma.weightLog.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Weight entry not found.');
    return { deleted: true };
  }

  // ─── Exercises (shared library) ───────────────────────────────────────────

  exercises(q?: string) {
    return this.prisma.exercise.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      take: 200,
    });
  }

  createExercise(dto: CreateExerciseDto) {
    return this.prisma.exercise.create({ data: { ...dto, name: dto.name.trim() } });
  }

  // ─── Workouts ─────────────────────────────────────────────────────────────

  async workouts(userId: string, days = 90) {
    const workouts = await this.prisma.workout.findMany({
      where: { userId, startedAt: { gte: new Date(Date.now() - days * 86_400_000) } },
      include: workoutInclude,
      orderBy: { startedAt: 'desc' },
    });
    return workouts.map((workout) => this.present(workout));
  }

  async workout(id: string, userId: string) {
    const workout = await this.prisma.workout.findFirst({ where: { id, userId }, include: workoutInclude });
    if (!workout) throw new NotFoundException('Workout not found.');
    return this.present(workout);
  }

  async createWorkout(dto: CreateWorkoutDto, userId: string) {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    this.assertTimes(startedAt, endedAt);
    await this.assertExercisesExist(dto.exercises);

    const workout = await this.prisma.workout.create({
      data: {
        userId,
        name: dto.name,
        notes: dto.notes,
        startedAt,
        endedAt,
        workoutExercises: { create: this.exerciseRows(dto.exercises) },
      },
      include: workoutInclude,
    });
    if (endedAt) this.events.publish({ type: 'WORKOUT_COMPLETED', userId, workoutId: workout.id });
    return this.present(workout);
  }

  async updateWorkout(id: string, dto: UpdateWorkoutDto, userId: string) {
    const existing = await this.prisma.workout.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Workout not found.');

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : existing.startedAt;
    const endedAt = dto.endedAt === undefined ? existing.endedAt : dto.endedAt ? new Date(dto.endedAt) : null;
    this.assertTimes(startedAt, endedAt);
    await this.assertExercisesExist(dto.exercises);

    const workout = await this.prisma.$transaction(async (tx) => {
      if (dto.exercises) await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
      return tx.workout.update({
        where: { id },
        data: {
          name: dto.name,
          notes: dto.notes,
          startedAt,
          endedAt,
          ...(dto.exercises ? { workoutExercises: { create: this.exerciseRows(dto.exercises) } } : {}),
        },
        include: workoutInclude,
      });
    });
    if (!existing.endedAt && endedAt) this.events.publish({ type: 'WORKOUT_COMPLETED', userId, workoutId: id });
    return this.present(workout);
  }

  async deleteWorkout(id: string, userId: string) {
    const { count } = await this.prisma.workout.deleteMany({ where: { id, userId } });
    if (!count) throw new NotFoundException('Workout not found.');
    return { deleted: true };
  }

  // ─── Progress ─────────────────────────────────────────────────────────────

  async progress(userId: string, weeks = 12) {
    const { today, timezone } = await this.clock.today(userId);
    const fromWeek = addDays(startOfWeek(today), -7 * (weeks - 1));
    const from = localMidnightUtc(fromWeek, timezone);

    const [weights, workouts, allSets] = await Promise.all([
      this.prisma.weightLog.findMany({
        where: { userId, recordedAt: { gte: from } },
        orderBy: { recordedAt: 'asc' },
      }),
      this.prisma.workout.findMany({
        where: { userId, startedAt: { gte: from } },
        include: workoutInclude,
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.workoutSet.findMany({
        where: { completed: true, workoutExercise: { workout: { userId } } },
        select: {
          weight: true,
          reps: true,
          workoutExercise: { select: { exercise: { select: { id: true, name: true } }, workout: { select: { startedAt: true } } } },
        },
      }),
    ]);

    const weekly = Array.from({ length: weeks }, (_, index) => {
      const week = addDays(fromWeek, index * 7);
      const inWeek = workouts.filter((workout) => startOfWeek(localDateKey(workout.startedAt, timezone)) === week);
      return {
        week,
        workouts: inWeek.length,
        volume: Math.round(
          inWeek.reduce(
            (sum, workout) => sum + workoutVolume(workout.workoutExercises.flatMap((entry) => entry.workoutSets)),
            0,
          ),
        ),
      };
    });

    const records = new Map<string, { exerciseId: string; name: string; maxWeight: number; bestOneRepMax: number; achievedAt: Date }>();
    for (const set of allSets) {
      const { exercise, workout } = set.workoutExercise;
      const oneRm = estimatedOneRepMax(set.weight ?? 0, set.reps ?? 0);
      const current = records.get(exercise.id);
      if (!current || oneRm > current.bestOneRepMax || (set.weight ?? 0) > current.maxWeight) {
        records.set(exercise.id, {
          exerciseId: exercise.id,
          name: exercise.name,
          maxWeight: Math.max(current?.maxWeight ?? 0, set.weight ?? 0),
          bestOneRepMax: Math.max(current?.bestOneRepMax ?? 0, oneRm),
          achievedAt: !current || oneRm > current.bestOneRepMax ? workout.startedAt : current.achievedAt,
        });
      }
    }

    const latest = weights.at(-1);
    const first = weights[0];
    return {
      weight: {
        series: weights.map((log) => ({ date: localDateKey(log.recordedAt, timezone), weight: log.weight, unit: log.unit })),
        latest: latest?.weight ?? null,
        change: latest && first ? Math.round((latest.weight - first.weight) * 10) / 10 : null,
        unit: latest?.unit ?? 'kg',
      },
      weekly,
      workoutsThisWeek: weekly.at(-1)?.workouts ?? 0,
      averagePerWeek: Math.round((weekly.reduce((sum, week) => sum + week.workouts, 0) / weeks) * 10) / 10,
      personalRecords: [...records.values()].sort((a, b) => b.bestOneRepMax - a.bestOneRepMax).slice(0, 10),
    };
  }

  private present(workout: WorkoutWithExercises) {
    const { workoutExercises, ...rest } = workout;
    const sets = workoutExercises.flatMap((entry) => entry.workoutSets);
    return {
      ...rest,
      durationMinutes: workout.endedAt
        ? Math.max(0, Math.round((workout.endedAt.getTime() - workout.startedAt.getTime()) / 60000))
        : null,
      volume: Math.round(workoutVolume(sets)),
      totalSets: sets.length,
      exercises: workoutExercises.map((entry) => ({
        id: entry.id,
        exerciseId: entry.exerciseId,
        orderIndex: entry.orderIndex,
        notes: entry.notes,
        exercise: entry.exercise,
        sets: entry.workoutSets.map(({ workoutExerciseId: _ignored, ...set }) => set),
      })),
    };
  }

  /** orderIndex / setNumber are derived from array position so they are always unique. */
  private exerciseRows(exercises: WorkoutExerciseDto[] = []) {
    return exercises.map((exercise, orderIndex) => ({
      exerciseId: exercise.exerciseId,
      orderIndex,
      notes: exercise.notes,
      workoutSets: {
        create: (exercise.sets ?? []).map((set, index) => ({
          setNumber: index + 1,
          weight: set.weight,
          reps: set.reps,
          duration: set.duration,
          completed: set.completed ?? false,
        })),
      },
    }));
  }

  private async assertExercisesExist(exercises?: WorkoutExerciseDto[]) {
    const ids = [...new Set((exercises ?? []).map((exercise) => exercise.exerciseId))];
    if (!ids.length) return;
    const found = await this.prisma.exercise.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('One or more exercises do not exist.');
  }

  private assertTimes(startedAt: Date, endedAt: Date | null) {
    if (endedAt && endedAt < startedAt) throw new BadRequestException('endedAt must be after startedAt.');
  }
}
