# LifeOS Database

PostgreSQL via Prisma. Schema: `apps/api/prisma/schema.prisma`; migrations in
`apps/api/prisma/migrations/` (apply with `npm run db:migrate`).

## Ownership

Every personal table has `userId` (FK → `User`, `ON DELETE CASCADE`) or reaches a user through
its parent (`RoutineItem → Routine`, `LearningTopic → LearningGoal`, `Milestone → Project`,
`WorkoutExercise → Workout`). `Exercise` is a shared library (seeded by `prisma/seed.mjs`).

```text
User ─┬─ Profile, UserSettings, Session*
      ├─< Routine ─< RoutineItem ─< RoutineLog
      ├─< Habit ─< HabitLog
      ├─< WeightLog
      ├─< Workout ─< WorkoutExercise ─< WorkoutSet      (WorkoutExercise >─ Exercise)
      ├─< LearningGoal ─< LearningTopic ;  LearningGoal/Topic ─< LearningSession
      ├─< Project ─< Task, Milestone
      ├─< FinanceAccount ─< Income, Expense ;  SavingsGoal, Investment
      └─< NotificationPreference, Notification
```

## Conventions

| Concern | Rule |
|---|---|
| Instants | `timestamp` in UTC |
| Log dates (`HabitLog.date`, `RoutineLog.date`) | `DATE` = the user's local calendar day |
| Time of day (`startTime`, `endTime`, `reminderTime`, quiet hours) | `VARCHAR(5)` `"HH:mm"`, local |
| Money | `DECIMAL(14,2)`; amounts `CHECK (> 0)`; account balance maintained in the same transaction as income/expense writes |
| Statuses / categories | Postgres enums (see schema) |
| Recurrence | `DAILY` · `WEEKDAYS` · `WEEKENDS` · `WEEKLY:MO,WE,FR` |

## Key constraints & indexes

Unique: `User.email`, `(habitId, date)`, `(routineItemId, date)`, `(userId, channel, category)`,
`(userId, dedupeKey)` on notifications, `Exercise.name`, `Session.tokenHash`.
Indexes follow spec §33 (user + date for every time-series table, `Task(userId, status)`,
`Task(userId, dueDate)`, `Notification(status, scheduledAt)`).

## Backups

Production: scheduled `pg_dump` (or managed snapshots) to encrypted storage, with a periodic
restore test (spec §54). Quick local backup:
`docker exec lifeos-postgres pg_dump -U lifeos lifeos > backup.sql`.
