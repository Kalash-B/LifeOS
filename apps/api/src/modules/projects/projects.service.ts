import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainEvents } from '../../common/events/domain-events.js';
import { UserClock } from '../../common/user-clock.service.js';
import { addDays, localDayRangeUtc, localMidnightUtc } from '../../common/utils/date.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateMilestoneDto,
  CreateProjectDto,
  CreateTaskDto,
  TaskQueryDto,
  UpdateMilestoneDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './projects.dto.js';

/** Default project progress rule (spec §56). */
export function taskProgress(total: number, completed: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

const toDate = (value?: string | null) => (value === undefined ? undefined : value === null ? null : new Date(value));

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: UserClock,
    private readonly events: DomainEvents,
  ) {}

  // ─── Projects ─────────────────────────────────────────────────────────────

  async list(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: { tasks: { select: { status: true, dueDate: true } }, _count: { select: { milestones: true } } },
      orderBy: [{ status: 'asc' }, { deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
    const now = new Date();
    return projects.map(({ tasks, _count, ...project }) => ({
      ...project,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((task) => task.status === 'COMPLETED').length,
      overdueTaskCount: tasks.filter((task) => task.status !== 'COMPLETED' && task.dueDate && task.dueDate < now).length,
      milestoneCount: _count.milestones,
    }));
  }

  async get(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        tasks: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
        milestones: { orderBy: { targetDate: { sort: 'asc', nulls: 'last' } } },
      },
    });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  create(dto: CreateProjectDto, userId: string) {
    this.assertDates(dto.startDate, dto.deadline);
    return this.prisma.project.create({
      data: {
        ...dto,
        userId,
        startDate: toDate(dto.startDate),
        deadline: toDate(dto.deadline),
        autoProgress: dto.autoProgress ?? dto.progress === undefined,
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const existing = await this.assertProject(id, userId);
    this.assertDates(
      dto.startDate ?? existing.startDate?.toISOString(),
      dto.deadline ?? existing.deadline?.toISOString(),
    );
    const autoProgress = dto.autoProgress ?? (dto.progress !== undefined ? false : undefined);
    const project = await this.prisma.project.update({
      where: { id },
      data: { ...dto, autoProgress, startDate: toDate(dto.startDate), deadline: toDate(dto.deadline) },
    });
    if (autoProgress) await this.recalculateProgress(id);
    if (dto.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      this.events.publish({ type: 'PROJECT_COMPLETED', userId, projectId: id, projectName: project.name });
    }
    return this.get(id, userId);
  }

  async remove(id: string, userId: string) {
    await this.assertProject(id, userId);
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Tasks ────────────────────────────────────────────────────────────────

  async projectTasks(projectId: string, userId: string) {
    await this.assertProject(projectId, userId);
    return this.prisma.task.findMany({ where: { projectId, userId }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] });
  }

  /** Cross-project task list with timezone-aware views (today / overdue / week). */
  async tasks(userId: string, query: TaskQueryDto) {
    const where: Prisma.TaskWhereInput = { userId, projectId: query.projectId, status: query.status };
    if (query.view) {
      const { today, timezone } = await this.clock.today(userId);
      const todayRange = localDayRangeUtc(today, timezone);
      where.status = { not: 'COMPLETED' };
      if (query.view === 'today') where.dueDate = { lt: todayRange.end };
      if (query.view === 'overdue') where.dueDate = { lt: todayRange.start };
      if (query.view === 'week') where.dueDate = { lt: localMidnightUtc(addDays(today, 7), timezone) };
    }
    return this.prisma.task.findMany({
      where,
      include: { project: { select: { id: true, name: true, category: true } } },
      orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: { sort: 'desc', nulls: 'last' } }, { createdAt: 'asc' }],
      take: 500,
    });
  }

  async createTask(projectId: string, dto: CreateTaskDto, userId: string) {
    await this.assertProject(projectId, userId);
    const position = dto.position ?? (await this.prisma.task.count({ where: { projectId } }));
    const task = await this.prisma.task.create({
      data: {
        ...dto,
        projectId,
        userId,
        position,
        dueDate: toDate(dto.dueDate),
        completedAt: dto.status === 'COMPLETED' ? new Date() : null,
      },
    });
    await this.recalculateProgress(projectId);
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto, userId: string) {
    const existing = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Task not found.');

    let completedAt: Date | null | undefined;
    if (dto.status === 'COMPLETED' && existing.status !== 'COMPLETED') completedAt = new Date();
    if (dto.status && dto.status !== 'COMPLETED') completedAt = null;

    const task = await this.prisma.task.update({
      where: { id },
      data: { ...dto, dueDate: toDate(dto.dueDate), completedAt },
    });
    await this.recalculateProgress(existing.projectId);
    if (completedAt) this.events.publish({ type: 'TASK_COMPLETED', userId, taskId: id, projectId: existing.projectId });
    return task;
  }

  async removeTask(id: string, userId: string) {
    const task = await this.prisma.task.findFirst({ where: { id, userId } });
    if (!task) throw new NotFoundException('Task not found.');
    await this.prisma.task.delete({ where: { id } });
    await this.recalculateProgress(task.projectId);
    return { deleted: true };
  }

  // ─── Milestones ───────────────────────────────────────────────────────────

  async createMilestone(projectId: string, dto: CreateMilestoneDto, userId: string) {
    await this.assertProject(projectId, userId);
    return this.prisma.milestone.create({ data: { ...dto, projectId, targetDate: toDate(dto.targetDate) } });
  }

  async updateMilestone(id: string, dto: UpdateMilestoneDto, userId: string) {
    await this.assertMilestone(id, userId);
    return this.prisma.milestone.update({ where: { id }, data: { ...dto, targetDate: toDate(dto.targetDate) } });
  }

  async removeMilestone(id: string, userId: string) {
    await this.assertMilestone(id, userId);
    await this.prisma.milestone.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertProject(id: string, userId: string) {
    const project = await this.prisma.project.findFirst({ where: { id, userId } });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  private async assertMilestone(id: string, userId: string) {
    const milestone = await this.prisma.milestone.findFirst({ where: { id, project: { userId } } });
    if (!milestone) throw new NotFoundException('Milestone not found.');
    return milestone;
  }

  private assertDates(start?: string | null, deadline?: string | null) {
    if (start && deadline && new Date(deadline) < new Date(start)) {
      throw new BadRequestException('Deadline must be on or after the start date.');
    }
  }

  private async recalculateProgress(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { autoProgress: true } });
    if (!project?.autoProgress) return;
    const [total, completed] = await Promise.all([
      this.prisma.task.count({ where: { projectId } }),
      this.prisma.task.count({ where: { projectId, status: 'COMPLETED' } }),
    ]);
    await this.prisma.project.update({ where: { id: projectId }, data: { progress: taskProgress(total, completed) } });
  }
}
