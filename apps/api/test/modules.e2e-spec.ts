import type { INestApplication } from '@nestjs/common';
import { api, createApp, registerUser, todayIn, type TestUser } from './utils.js';

const TZ = 'Asia/Kolkata';

describe('Core modules (end to end through API → service → database)', () => {
  let app: INestApplication;
  let user: TestUser;
  let client: ReturnType<typeof api>;
  const today = todayIn(TZ);

  beforeAll(async () => {
    app = await createApp();
    user = await registerUser(app, 'modules', TZ);
    client = api(app, user);
  });
  afterAll(() => app.close());

  it('routine: create, schedule, complete and see it in today’s view', async () => {
    const routine = (await client.post('/routines').send({ name: 'Morning' }).expect(201)).body.data;
    const item = (
      await client
        .post(`/routines/${routine.id}/items`)
        .send({ title: 'Plan the day', startTime: '07:00', endTime: '07:15', recurrenceRule: 'DAILY' })
        .expect(201)
    ).body.data;
    await client.post(`/routines/${routine.id}/items`).send({ title: 'Bad times', startTime: '09:00', endTime: '08:00' }).expect(400);
    await client.post(`/routines/${routine.id}/items`).send({ title: 'Bad rule', recurrenceRule: 'MONTHLY' }).expect(400);

    let day = (await client.get('/routines/today').expect(200)).body.data;
    expect(day.date).toBe(today);
    expect(day.items.map((i: { id: string }) => i.id)).toContain(item.id);
    expect(day.completed).toBe(0);

    await client.post(`/routines/items/${item.id}/log`).send({ date: today, status: 'COMPLETED' }).expect(201);
    day = (await client.get('/routines/today').expect(200)).body.data;
    expect(day.completed).toBe(1);
    expect(day.completionRate).toBe(100);
  });

  it('habits: create, complete, streak, archive', async () => {
    const habit = (
      await client.post('/habits').send({ name: 'Read', frequencyType: 'daily', targetValue: 20, unit: 'pages', reminderTime: '21:00' }).expect(201)
    ).body.data;
    expect(habit.frequencyType).toBe('DAILY');

    await client.post(`/habits/${habit.id}/log`).send({ date: today, status: 'COMPLETED', value: 20 }).expect(201);
    const stats = (await client.get(`/habits/${habit.id}/stats`).expect(200)).body.data;
    expect(stats.streak.current).toBe(1);
    expect(stats.history).toHaveLength(1);

    const list = (await client.get('/habits').expect(200)).body.data;
    expect(list.find((h: { id: string }) => h.id === habit.id).todayStatus).toBe('COMPLETED');

    await client.patch(`/habits/${habit.id}`).send({ isActive: false }).expect(200);
    expect((await client.get('/habits').expect(200)).body.data).toHaveLength(0);
    expect((await client.get('/habits?includeArchived=true').expect(200)).body.data).toHaveLength(1);
    await client.patch(`/habits/${habit.id}`).send({ isActive: true }).expect(200);

    await client.post('/habits').send({ name: 'Bad', frequencyType: 'HOURLY' }).expect(400);
    await client.post('/habits').send({ name: 'Bad', frequencyType: 'DAILY', targetValue: -1 }).expect(400);
  });

  it('fitness: weight log, workout with sets, progress and validation', async () => {
    await client.post('/fitness/weight').send({ weight: 72.5 }).expect(201);
    await client.post('/fitness/weight').send({ weight: -3 }).expect(400);

    const exercises = (await client.get('/fitness/exercises?q=bench').expect(200)).body.data;
    expect(exercises.length).toBeGreaterThan(0);

    // Start within today's local date regardless of when the suite runs.
    const now = Math.max(Date.now(), new Date(`${today}T00:00:00+05:30`).getTime() + 3600_000 + 60_000);
    const workout = (
      await client
        .post('/fitness/workouts')
        .send({
          name: 'Push day',
          startedAt: new Date(now - 3600_000).toISOString(),
          endedAt: new Date(now).toISOString(),
          exercises: [{ exerciseId: exercises[0].id, sets: [{ weight: 60, reps: 8, completed: true }, { weight: 60, reps: 8, completed: true }] }],
        })
        .expect(201)
    ).body.data;
    expect(workout.volume).toBe(960);
    expect(workout.durationMinutes).toBe(60);
    expect(workout.exercises[0].sets.map((s: { setNumber: number }) => s.setNumber)).toEqual([1, 2]);

    await client
      .post('/fitness/workouts')
      .send({ name: 'Bad', exercises: [{ exerciseId: exercises[0].id, sets: [{ reps: -1 }] }] })
      .expect(400);
    await client
      .post('/fitness/workouts')
      .send({ name: 'Ghost', exercises: [{ exerciseId: '00000000-0000-4000-8000-000000000000' }] })
      .expect(400);

    const updated = (await client.patch(`/fitness/workouts/${workout.id}`).send({ notes: 'Felt strong' }).expect(200)).body.data;
    expect(updated.notes).toBe('Felt strong');
    expect(updated.exercises).toHaveLength(1);

    const progress = (await client.get('/fitness/progress').expect(200)).body.data;
    expect(progress.weight.latest).toBe(72.5);
    expect(progress.workoutsThisWeek).toBeGreaterThanOrEqual(1);
    expect(progress.personalRecords[0].maxWeight).toBe(60);
  });

  it('learning: goal → topics → sessions → stats', async () => {
    const goal = (await client.post('/learning/goals').send({ name: 'DSA', category: 'Programming' }).expect(201)).body.data;
    const topic = (await client.post(`/learning/goals/${goal.id}/topics`).send({ name: 'Graphs' }).expect(201)).body.data;
    await client.post(`/learning/goals/${goal.id}/topics`).send({ name: 'DP' }).expect(201);
    await client.patch(`/learning/topics/${topic.id}`).send({ status: 'COMPLETED' }).expect(200);
    expect((await client.get(`/learning/goals/${goal.id}`).expect(200)).body.data.progress).toBe(50);

    // Keep the whole session inside today's local date (Asia/Kolkata is a fixed UTC+5:30),
    // so the test doesn't depend on the time of day it runs.
    const localMidnight = new Date(`${today}T00:00:00+05:30`).getTime();
    const start = Math.max(Date.now() - 45 * 60_000, localMidnight + 60_000);
    const startedAt = new Date(start).toISOString();
    const session = (
      await client
        .post('/learning/sessions')
        .send({ learningGoalId: goal.id, learningTopicId: topic.id, startedAt, endedAt: new Date(start + 45 * 60_000).toISOString(), productivityRating: 4 })
        .expect(201)
    ).body.data;
    expect(session.durationMinutes).toBe(45);
    await client.post('/learning/sessions').send({ learningGoalId: goal.id, startedAt }).expect(400);

    const stats = (await client.get('/learning/stats').expect(200)).body.data;
    expect(stats.today).toBe(45);
    expect(stats.studyStreakDays).toBe(1);
    expect(stats.byGoal[0].name).toBe('DSA');
  });

  it('projects: auto progress from tasks, manual override, milestones, task views', async () => {
    const project = (await client.post('/projects').send({ name: 'LifeOS', category: 'startup', priority: 'HIGH' }).expect(201)).body.data;
    expect(project.category).toBe('STARTUP');
    const t1 = (await client.post(`/projects/${project.id}/tasks`).send({ title: 'Schema', dueDate: new Date().toISOString() }).expect(201)).body.data;
    await client.post(`/projects/${project.id}/tasks`).send({ title: 'API' }).expect(201);

    const completed = (await client.patch(`/tasks/${t1.id}`).send({ status: 'COMPLETED' }).expect(200)).body.data;
    expect(completed.completedAt).toBeTruthy();
    expect((await client.get(`/projects/${project.id}`).expect(200)).body.data.progress).toBe(50);

    const reopened = (await client.patch(`/tasks/${t1.id}`).send({ status: 'TODO' }).expect(200)).body.data;
    expect(reopened.completedAt).toBeNull();
    expect((await client.get('/tasks?view=today').expect(200)).body.data.map((t: { id: string }) => t.id)).toContain(t1.id);

    const manual = (await client.patch(`/projects/${project.id}`).send({ progress: 80 }).expect(200)).body.data;
    expect(manual.autoProgress).toBe(false);
    expect(manual.progress).toBe(80);

    await client.post(`/projects/${project.id}/milestones`).send({ name: 'MVP', targetDate: '2026-12-01' }).expect(201);
    await client.post('/projects').send({ name: 'Bad', category: 'PERSONAL', startDate: '2026-10-10', deadline: '2026-10-01' }).expect(400);
    await client.post('/projects').send({ name: 'Bad', category: 'PERSONAL', progress: 150 }).expect(400);
  });

  it('finance: balances move transactionally, savings = income − expenses', async () => {
    const account = (await client.post('/finance/accounts').send({ name: 'HDFC', type: 'bank', openingBalance: 1000 }).expect(201)).body.data;
    expect(account.currentBalance).toBe(1000);

    await client.post('/finance/income').send({ accountId: account.id, amount: 50000, source: 'Salary', category: 'Salary', incomeDate: new Date().toISOString() }).expect(201);
    const expense = (
      await client.post('/finance/expenses').send({ accountId: account.id, amount: 1250.5, category: 'Food', expenseDate: new Date().toISOString() }).expect(201)
    ).body.data;
    expect(expense.amount).toBe(1250.5);

    await client.post('/finance/expenses').send({ accountId: account.id, amount: 0, category: 'Food', expenseDate: new Date().toISOString() }).expect(400);
    await client.post('/finance/expenses').send({ accountId: account.id, amount: 1.234, category: 'Food', expenseDate: new Date().toISOString() }).expect(400);

    let accounts = (await client.get('/finance/accounts').expect(200)).body.data;
    expect(accounts[0].currentBalance).toBe(49749.5);

    const summary = (await client.get('/finance/summary').expect(200)).body.data;
    expect(summary.income).toBe(50000);
    expect(summary.expenses).toBe(1250.5);
    expect(summary.savings).toBe(48749.5);
    expect(summary.expensesByCategory[0]).toEqual({ category: 'Food', amount: 1250.5 });

    await client.delete(`/finance/expenses/${expense.id}`).expect(200);
    accounts = (await client.get('/finance/accounts').expect(200)).body.data;
    expect(accounts[0].currentBalance).toBe(51000);

    const goal = (await client.post('/finance/savings').send({ name: 'Laptop', targetAmount: 1000 }).expect(201)).body.data;
    const reached = (await client.patch(`/finance/savings/${goal.id}`).send({ currentAmount: 1000 }).expect(200)).body.data;
    expect(reached.status).toBe('ACHIEVED');
  });

  it('notifications: preferences, scheduled reminders, achievements via events', async () => {
    const prefs = (await client.get('/notifications/preferences').expect(200)).body.data;
    expect(prefs.categories.every((c: { enabled: boolean }) => c.enabled)).toBe(true);
    await client.put('/notifications/preferences').send({ preferences: [{ channel: 'IN_APP', category: 'DAILY_REVIEW', enabled: false }] }).expect(200);

    const reminder = (
      await client.post('/notifications/reminders').send({ title: 'Call mom', scheduledAt: new Date(Date.now() + 3600_000).toISOString() }).expect(201)
    ).body.data;
    expect(reminder.status).toBe('PENDING');
    expect((await client.get('/notifications/scheduled').expect(200)).body.data).toHaveLength(1);

    // Savings goal reached earlier publishes SAVINGS_MILESTONE → delivered in-app.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const inbox = await client.get('/notifications').expect(200);
    expect(inbox.body.meta).toMatchObject({ page: 1, limit: 20 });
    const milestone = inbox.body.data.find((n: { type: string }) => n.type === 'SAVINGS_MILESTONE');
    expect(milestone).toBeTruthy();

    expect((await client.get('/notifications/unread-count').expect(200)).body.data.count).toBeGreaterThan(0);
    await client.post('/notifications/read-all').expect(200);
    expect((await client.get('/notifications/unread-count').expect(200)).body.data.count).toBe(0);
  });

  it('analytics + dashboard: cross-module numbers reflect the data above', async () => {
    const daily = (await client.get('/analytics/daily').expect(200)).body.data;
    expect(daily.date).toBe(today);
    expect(daily.routineCompletionRate).toBe(100);
    expect(daily.habitCompletionRate).toBe(100);
    expect(daily.studyMinutes).toBe(45);
    expect(daily.workoutCompleted).toBe(true);
    expect(daily.score.score).toBeGreaterThan(0);
    expect(daily.score.breakdown).toHaveLength(6);

    const weekly = (await client.get('/analytics/weekly').expect(200)).body.data;
    expect(weekly.days).toHaveLength(7);
    expect(weekly.workoutCount).toBe(1);

    const dashboard = (await client.get('/dashboard/today').expect(200)).body.data;
    expect(dashboard.routine.completed).toBe(1);
    expect(dashboard.habits.completed).toBe(1);
    expect(dashboard.learning).toEqual({ minutes: 45, goalMinutes: 60 });

    const summary = (await client.get('/dashboard/summary').expect(200)).body.data;
    expect(summary.finance.income).toBe(50000);
    expect(summary.projects.length).toBeGreaterThan(0);
  });

  it('users: profile, settings with validated score weights, export', async () => {
    const me = (await client.patch('/users/me').send({ displayName: 'Kalash', timezone: 'Europe/London' }).expect(200)).body.data;
    expect(me.timezone).toBe('Europe/London');
    await client.patch('/users/me').send({ timezone: 'Mars/Olympus' }).expect(400);
    await client.patch('/users/me').send({ timezone: TZ }).expect(200);

    await client.patch('/users/me/settings').send({ scoreWeights: { routine: 50, habits: 50, fitness: 0, learning: 0, projects: 0, finance: 10 } }).expect(400);
    const settings = (
      await client.patch('/users/me/settings').send({ scoreWeights: { routine: 50, habits: 50, fitness: 0, learning: 0, projects: 0, finance: 0 }, quietHoursStart: '22:00', quietHoursEnd: '07:00' }).expect(200)
    ).body.data;
    expect(settings.scoreWeights.routine).toBe(50);

    const exported = (await client.get('/users/me/export').expect(200)).body.data;
    expect(exported.format).toBe('lifeos-export-v1');
    expect(exported.habits.length).toBe(1);
    expect(JSON.stringify(exported)).not.toContain('passwordHash');
  });
});
