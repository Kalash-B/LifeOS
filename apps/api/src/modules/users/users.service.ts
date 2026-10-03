import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DEFAULT_SCORE_WEIGHTS, type ScoreWeights } from '../analytics/score.js';
import { ChangePasswordDto, UpdateProfileDto, UpdateSettingsDto } from './users.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return {
      ...settings,
      scoreWeights: (settings.scoreWeights as ScoreWeights | null) ?? DEFAULT_SCORE_WEIGHTS,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        timezone: true,
        createdAt: true,
        profile: true,
      },
    });
    return { ...user, settings: await this.getSettings(userId) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { timezone, ...profile } = dto;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        timezone,
        profile: {
          upsert: {
            create: { ...profile, dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined },
            update: { ...profile, dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : undefined },
          },
        },
      },
    });
    return this.getMe(userId);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    if (dto.scoreWeights) {
      const total = Object.values(dto.scoreWeights).reduce((sum, weight) => sum + weight, 0);
      if (total !== 100) throw new BadRequestException('Score weights must add up to 100.');
    }
    const data = { ...dto, scoreWeights: dto.scoreWeights ? { ...dto.scoreWeights } : undefined };
    await this.prisma.userSettings.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    return this.getSettings(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
      }),
      // Sign out every other device.
      this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { changed: true };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Password is incorrect.');
    }
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }

  /** Full personal data export (spec §53). Secrets (password hash, sessions) are excluded. */
  async exportData(userId: string) {
    const where = { userId };
    const [me, routines, habits, weightLogs, workouts, learningGoals, learningSessions, projects, accounts, incomes, expenses, savingsGoals, investments, notifications] =
      await Promise.all([
        this.getMe(userId),
        this.prisma.routine.findMany({ where, include: { routineItems: { include: { routineLogs: true } } } }),
        this.prisma.habit.findMany({ where, include: { habitLogs: true } }),
        this.prisma.weightLog.findMany({ where }),
        this.prisma.workout.findMany({
          where,
          include: { workoutExercises: { include: { exercise: true, workoutSets: true } } },
        }),
        this.prisma.learningGoal.findMany({ where, include: { topics: true } }),
        this.prisma.learningSession.findMany({ where }),
        this.prisma.project.findMany({ where, include: { tasks: true, milestones: true } }),
        this.prisma.financeAccount.findMany({ where }),
        this.prisma.income.findMany({ where }),
        this.prisma.expense.findMany({ where }),
        this.prisma.savingsGoal.findMany({ where }),
        this.prisma.investment.findMany({ where }),
        this.prisma.notification.findMany({ where }),
      ]);
    return {
      exportedAt: new Date().toISOString(),
      format: 'lifeos-export-v1',
      profile: me,
      routine: routines,
      habits,
      fitness: { weightLogs, workouts },
      learning: { goals: learningGoals, sessions: learningSessions },
      projects,
      finance: { accounts, incomes, expenses, savingsGoals, investments },
      notifications,
    };
  }
}
