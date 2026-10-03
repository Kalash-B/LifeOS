import type { INestApplication } from '@nestjs/common';
import { api, createApp, registerUser, todayIn, type TestUser } from './utils.js';

/** Spec §44: User A must never access User B's data. */
describe('Security: cross-user isolation and input hardening', () => {
  let app: INestApplication;
  let owner: TestUser;
  let intruder: TestUser;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await createApp();
    owner = await registerUser(app, 'owner');
    intruder = await registerUser(app, 'intruder');
    const a = api(app, owner);

    ids.routine = (await a.post('/routines').send({ name: 'Private routine' })).body.data.id;
    ids.routineItem = (await a.post(`/routines/${ids.routine}/items`).send({ title: 'Secret' })).body.data.id;
    ids.habit = (await a.post('/habits').send({ name: 'Private habit', frequencyType: 'DAILY' })).body.data.id;
    ids.weight = (await a.post('/fitness/weight').send({ weight: 70 })).body.data.id;
    ids.workout = (await a.post('/fitness/workouts').send({ name: 'Private workout' })).body.data.id;
    ids.goal = (await a.post('/learning/goals').send({ name: 'Private goal', category: 'x' })).body.data.id;
    ids.topic = (await a.post(`/learning/goals/${ids.goal}/topics`).send({ name: 'Topic' })).body.data.id;
    ids.session = (await a.post('/learning/sessions').send({ learningGoalId: ids.goal, startedAt: new Date().toISOString(), durationMinutes: 10 })).body.data.id;
    ids.project = (await a.post('/projects').send({ name: 'Private project', category: 'PERSONAL' })).body.data.id;
    ids.task = (await a.post(`/projects/${ids.project}/tasks`).send({ title: 'Private task' })).body.data.id;
    ids.milestone = (await a.post(`/projects/${ids.project}/milestones`).send({ name: 'M1' })).body.data.id;
    ids.account = (await a.post('/finance/accounts').send({ name: 'Private bank', type: 'BANK' })).body.data.id;
    ids.expense = (await a.post('/finance/expenses').send({ accountId: ids.account, amount: 10, category: 'Food', expenseDate: new Date().toISOString() })).body.data.id;
    ids.income = (await a.post('/finance/income').send({ accountId: ids.account, amount: 10, source: 'x', category: 'x', incomeDate: new Date().toISOString() })).body.data.id;
    ids.savings = (await a.post('/finance/savings').send({ name: 'Goal', targetAmount: 100 })).body.data.id;
    ids.investment = (await a.post('/finance/investments').send({ name: 'Fund', assetType: 'MF', amountInvested: 100 })).body.data.id;
    ids.reminder = (await a.post('/notifications/reminders').send({ title: 'x', scheduledAt: new Date(Date.now() + 3600_000).toISOString() })).body.data.id;
  });
  afterAll(() => app.close());

  it('owner fixtures were created', () => {
    for (const [key, value] of Object.entries(ids)) expect(value, key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([
    ['get', () => `/routines/${ids.routine}`],
    ['patch', () => `/routines/${ids.routine}`, { name: 'pwned' }],
    ['delete', () => `/routines/${ids.routine}`],
    ['post', () => `/routines/${ids.routine}/items`, { title: 'x' }],
    ['patch', () => `/routines/items/${ids.routineItem}`, { title: 'x' }],
    ['post', () => `/routines/items/${ids.routineItem}/log`, { date: todayIn('UTC'), status: 'COMPLETED' }],
    ['get', () => `/habits/${ids.habit}`],
    ['patch', () => `/habits/${ids.habit}`, { name: 'x' }],
    ['delete', () => `/habits/${ids.habit}`],
    ['post', () => `/habits/${ids.habit}/log`, { date: todayIn('UTC') }],
    ['get', () => `/habits/${ids.habit}/stats`],
    ['delete', () => `/fitness/weight/${ids.weight}`],
    ['get', () => `/fitness/workouts/${ids.workout}`],
    ['patch', () => `/fitness/workouts/${ids.workout}`, { name: 'x' }],
    ['delete', () => `/fitness/workouts/${ids.workout}`],
    ['get', () => `/learning/goals/${ids.goal}`],
    ['patch', () => `/learning/goals/${ids.goal}`, { name: 'x' }],
    ['delete', () => `/learning/goals/${ids.goal}`],
    ['post', () => `/learning/goals/${ids.goal}/topics`, { name: 'x' }],
    ['patch', () => `/learning/topics/${ids.topic}`, { name: 'x' }],
    ['delete', () => `/learning/sessions/${ids.session}`],
    ['get', () => `/projects/${ids.project}`],
    ['patch', () => `/projects/${ids.project}`, { name: 'x' }],
    ['delete', () => `/projects/${ids.project}`],
    ['get', () => `/projects/${ids.project}/tasks`],
    ['post', () => `/projects/${ids.project}/tasks`, { title: 'x' }],
    ['patch', () => `/tasks/${ids.task}`, { status: 'COMPLETED' }],
    ['delete', () => `/tasks/${ids.task}`],
    ['patch', () => `/milestones/${ids.milestone}`, { name: 'x' }],
    ['patch', () => `/finance/accounts/${ids.account}`, { name: 'x' }],
    ['delete', () => `/finance/accounts/${ids.account}`],
    ['delete', () => `/finance/expenses/${ids.expense}`],
    ['delete', () => `/finance/income/${ids.income}`],
    ['patch', () => `/finance/savings/${ids.savings}`, { currentAmount: 1 }],
    ['patch', () => `/finance/investments/${ids.investment}`, { currentValue: 1 }],
    ['patch', () => `/notifications/${ids.reminder}/read`],
    ['delete', () => `/notifications/${ids.reminder}`],
  ] as const)('intruder cannot %s %s', async (method, path, body?: object) => {
    const client = api(app, intruder);
    const response = await client[method](path()).send(body ?? {});
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it("cannot spend from someone else's account", async () => {
    await api(app, intruder)
      .post('/finance/expenses')
      .send({ accountId: ids.account, amount: 5, category: 'x', expenseDate: new Date().toISOString() })
      .expect(404);
  });

  it("cannot log a session against someone else's goal", async () => {
    await api(app, intruder)
      .post('/learning/sessions')
      .send({ learningGoalId: ids.goal, startedAt: new Date().toISOString(), durationMinutes: 5 })
      .expect(404);
  });

  it("list endpoints never leak another user's records", async () => {
    const client = api(app, intruder);
    for (const path of ['/routines', '/habits', '/fitness/workouts', '/fitness/weight', '/learning/goals', '/learning/sessions', '/projects', '/tasks', '/finance/accounts', '/finance/expenses', '/finance/income', '/finance/savings', '/finance/investments', '/notifications/scheduled']) {
      const response = await client.get(path).expect(200);
      expect(response.body.data, path).toEqual([]);
    }
  });

  it('owner data is untouched after the attack', async () => {
    const project = (await api(app, owner).get(`/projects/${ids.project}`).expect(200)).body.data;
    expect(project.name).toBe('Private project');
    expect(project.tasks).toHaveLength(1);
  });

  it('rejects malformed IDs with 400, not a server error', async () => {
    const response = await api(app, owner).get('/habits/not-a-uuid').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects unknown properties (mass-assignment protection)', async () => {
    await api(app, owner).post('/habits').send({ name: 'x', frequencyType: 'DAILY', userId: intruder.id }).expect(400);
    await api(app, owner).patch(`/projects/${ids.project}`).send({ userId: intruder.id }).expect(400);
  });

  it('ignores client-supplied user ids — ownership always comes from the token', async () => {
    const list = (await api(app, intruder).get(`/habits?userId=${owner.id}`)).status;
    expect(list).toBe(400);
  });
});
