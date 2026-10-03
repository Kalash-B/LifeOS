# LifeOS — Complete Product & Technical Specification

> **Document purpose:** Master reference specification for designing, developing, testing, deploying, and extending LifeOS.
>
> **Rule:** When a new feature is proposed, first check this document for the relevant module, data model, architecture, naming convention, and security rule. Update the specification before implementing major architectural changes.

---

# 1. Project Overview

## 1.1 Product Name

**LifeOS — Personal Life Operating System**

## 1.2 One-Line Idea

LifeOS is a unified personal management platform that helps a user plan their day, build habits, track fitness, manage learning, execute projects, monitor finances, receive intelligent reminders, and understand long-term progress from one system.

## 1.3 Problem

Personal information is usually scattered across:

- Calendar applications
- To-do applications
- Habit trackers
- Fitness applications
- Notes
- Learning platforms
- Project-management tools
- Spreadsheet-based finance trackers

This fragmentation makes it difficult to answer questions such as:

- What did I actually accomplish today?
- Am I consistent with my habits?
- How much time am I spending on learning?
- Is my fitness progressing?
- Which projects are moving forward?
- Where is my money going?
- Am I spending time according to my priorities?
- What should I focus on next?

LifeOS combines these areas into one connected system.

## 1.4 Product Philosophy

LifeOS should follow five principles:

1. **One user, one system of record**
2. **Modules should share data instead of duplicating it**
3. **Every important activity should be measurable**
4. **Analytics should explain progress, not merely display numbers**
5. **Automation should reduce repetitive work without removing user control**

---

# 2. Core Feature Structure

```text
LifeOS
│
├── Dashboard
│
├── Daily Routine
│
├── Habits
│
├── Fitness
│   ├── Weight
│   ├── Exercises
│   ├── Workouts
│   └── Progress
│
├── Learning
│   ├── Goals
│   ├── Subjects
│   ├── Study Sessions
│   └── Progress
│
├── Projects
│   ├── Personal
│   ├── Startup
│   ├── Tasks
│   └── Milestones
│
├── Finance
│   ├── Accounts
│   ├── Income
│   ├── Expenses
│   ├── Savings
│   └── Investments
│
├── Notifications
│   ├── Reminders
│   ├── Deadlines
│   ├── Habit Reminders
│   └── Achievements
│
└── Analytics
    ├── Daily
    ├── Weekly
    ├── Monthly
    ├── Productivity
    ├── Fitness
    ├── Learning
    ├── Projects
    └── Finance
```

---

# 3. Target Users

## Primary User

An individual who wants one system to manage:

- Daily schedule
- Personal goals
- Habits
- Fitness
- Learning
- Projects
- Money
- Progress

## Future Users

The architecture should leave room for:

- Students
- Developers
- Freelancers
- Entrepreneurs
- Professionals
- Teams or families in a future version

**Important:** V1 should remain primarily a single-user personal productivity product. Do not over-engineer multi-user collaboration before the core system works.

---

# 4. Product Scope

## V1 — Core

- Authentication
- User profile
- Dashboard
- Daily routine
- Habits
- Fitness
- Learning
- Projects
- Finance
- Notifications
- Analytics
- Responsive web interface

## V1.5

- PWA/mobile experience
- Offline support for selected features
- Calendar integration
- Better notification scheduling
- Data export
- Import/export backup

## V2

- AI personal assistant
- Natural-language task creation
- Intelligent schedule suggestions
- Personal insights
- Goal recommendations
- Advanced forecasting
- Voice input

## V3 / Future

- Multi-user collaboration
- Family/workspace mode
- Wearable integrations
- Bank integrations where legally and technically appropriate
- Advanced automation
- Cross-device synchronization

---

# 5. High-Level System Architecture

LifeOS should initially use a **modular monolith**, not microservices.

```text
                         ┌──────────────────────┐
                         │       LIFEOS         │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │    Client Layer      │
                         │                      │
                         │ Next.js Web / PWA    │
                         └──────────┬───────────┘
                                    │
                              HTTPS / API
                                    │
                         ┌──────────▼───────────┐
                         │    API / Backend     │
                         │                      │
                         │ Authentication       │
                         │ Dashboard            │
                         │ Routine              │
                         │ Habits               │
                         │ Fitness              │
                         │ Learning             │
                         │ Projects             │
                         │ Finance              │
                         │ Notifications        │
                         │ Analytics            │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              │                     │                      │
              ▼                     ▼                      ▼
       ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
       │ PostgreSQL   │      │ Redis        │      │ Object       │
       │              │      │              │      │ Storage      │
       │ Main data    │      │ Cache/Queue  │      │ Files/Images │
       └──────────────┘      └──────┬───────┘      └──────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │ Notification    │
                           │ Worker          │
                           └────────┬────────┘
                                    │
                            ┌───────┴────────┐
                            ▼                ▼
                         Web Push          Email
```

## Why Modular Monolith?

For V1:

- Easier development
- Easier debugging
- Easier deployment
- One database
- Lower infrastructure cost
- Clear module boundaries
- Can later extract high-load modules into services

Do not introduce microservices just to make the architecture diagram look advanced.

---

# 6. Architecture Layers

Each backend module follows:

```text
Request
   │
   ▼
Route
   │
   ▼
Authentication Middleware
   │
   ▼
Authorization
   │
   ▼
Validation
   │
   ▼
Controller
   │
   ▼
Service
   │
   ▼
Repository / ORM
   │
   ▼
PostgreSQL
```

## Layer Responsibilities

### Route

Defines API endpoint and HTTP method.

### Middleware

Handles:

- Authentication
- Authorization
- Rate limiting
- Request context
- Error handling

### Validation

Validates:

- Required fields
- Types
- Ranges
- Business input constraints

### Controller

Handles HTTP concerns.

### Service

Contains business logic.

### Repository

Handles database access.

### Database

Stores persistent application data.

---

# 7. Recommended Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| Next.js | Web framework |
| React | UI |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | Reusable UI components |
| React Hook Form | Forms |
| Zod | Validation |
| TanStack Query | Server-state management |
| Zustand | Lightweight client state |
| Recharts / ECharts | Analytics charts |
| Lucide Icons | Icons |

## Backend

Recommended:

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| TypeScript | Type safety |
| NestJS | Structured backend framework |
| Prisma | ORM |
| Zod / class-validator | Validation |
| JWT / secure sessions | Authentication |
| Swagger/OpenAPI | API documentation |

Express can also be used, but NestJS is preferred if the objective is to demonstrate structured backend architecture.

## Database

**PostgreSQL**

Reason:

- Strong relational model
- Transactions
- Constraints
- Aggregation
- Analytics
- Excellent support for structured relationships
- Good long-term fit for LifeOS

## Cache / Queue

**Redis**

Use for:

- Caching
- Notification queues
- Background jobs
- Rate limiting
- Temporary data

Do not use Redis as the primary database.

## Storage

S3-compatible object storage for:

- Profile images
- Export files
- Attachments
- Generated reports

## DevOps

- Docker
- Docker Compose
- Git
- GitHub
- GitHub Actions
- Nginx or managed reverse proxy
- Cloud/VPS deployment
- Sentry or equivalent error monitoring

---

# 8. User Access Design

## 8.1 Guest

```text
Guest
│
├── Landing Page
├── Features
├── Documentation
├── Login
└── Register
```

No private data is accessible.

## 8.2 Authenticated User

```text
User
│
├── Dashboard
├── Routine
├── Habits
├── Fitness
├── Learning
├── Projects
├── Finance
├── Notifications
├── Analytics
└── Settings
```

The user can manage their own data.

## 8.3 Admin

Admin functionality should be separated from normal user functionality.

```text
Admin
│
├── User Management
├── System Health
├── Audit Logs
├── Notification System
└── Platform Configuration
```

Admin access to private personal information should be explicitly restricted and audited.

---

# 9. Authentication Design

```text
Register
   │
   ▼
Validate Input
   │
   ▼
Hash Password
   │
   ▼
Create User
   │
   ▼
Create Session
   │
   ▼
Authenticated
```

Login:

```text
Login
  │
  ▼
Validate Credentials
  │
  ▼
Create Session / Token
  │
  ▼
Authenticated Request
```

## Security Requirements

- Passwords must never be stored as plaintext
- Use a strong password hashing algorithm
- Use HTTPS
- Validate every request
- Rate-limit authentication endpoints
- Use secure session/token handling
- Rotate refresh credentials where applicable
- Never trust user IDs supplied by the client for ownership
- Check resource ownership on the server
- Keep secrets in environment variables
- Do not commit `.env` files

Reference: OWASP Authentication Cheat Sheet:
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

# 10. Central Data Ownership Model

The central relationship is:

```text
USER
 │
 ├── Routine
 ├── Habits
 ├── Fitness
 ├── Learning
 ├── Projects
 ├── Finance
 ├── Notifications
 └── Analytics
```

Every personal record must be traceable to the authenticated user.

Most tables should contain:

```text
id
user_id
created_at
updated_at
```

Where relevant:

```text
deleted_at
```

can support soft deletion.

---

# 11. Database Design

## 11.1 Users

```text
users
-----
id
email
password_hash
status
timezone
created_at
updated_at
```

## 11.2 Profiles

```text
profiles
--------
id
user_id
display_name
avatar_url
bio
date_of_birth
preferred_language
created_at
updated_at
```

Keep sensitive information minimal.

---

# 12. Routine Database

## routines

```text
id
user_id
name
description
is_active
created_at
updated_at
```

## routine_items

```text
id
routine_id
title
description
category
start_time
end_time
priority
recurrence_rule
position
created_at
updated_at
```

## routine_logs

```text
id
routine_item_id
user_id
date
status
completed_at
notes
created_at
updated_at
```

Statuses:

```text
PENDING
COMPLETED
SKIPPED
MISSED
```

---

# 13. Habit Database

## habits

```text
id
user_id
name
description
frequency_type
target_value
unit
reminder_time
is_active
created_at
updated_at
```

## habit_logs

```text
id
habit_id
user_id
date
status
value
notes
created_at
updated_at
```

Examples:

```text
Drink Water
Read
DSA
Gym
Meditation
Guitar
```

Do not hard-code these habits into the database.

Users should be able to create any habit.

---

# 14. Fitness Database

## exercises

```text
id
name
muscle_group
equipment
description
created_at
updated_at
```

## weight_logs

```text
id
user_id
weight
unit
recorded_at
notes
```

## workouts

```text
id
user_id
name
started_at
ended_at
notes
created_at
updated_at
```

## workout_exercises

```text
id
workout_id
exercise_id
order_index
notes
```

## workout_sets

```text
id
workout_exercise_id
set_number
weight
reps
duration
completed
```

This supports:

- Weight tracking
- Exercise history
- Sets/reps
- Strength progression
- Personal records
- Workout volume
- Workout frequency

---

# 15. Learning Database

## learning_goals

```text
id
user_id
name
description
category
target_date
status
progress
created_at
updated_at
```

Examples:

```text
DSA
Guitar
GoLang
Cloud
Cyber Security
Machine Learning
```

## learning_topics

```text
id
learning_goal_id
name
description
status
progress
position
```

## learning_sessions

```text
id
user_id
learning_goal_id
learning_topic_id
started_at
ended_at
duration_minutes
productivity_rating
notes
created_at
updated_at
```

---

# 16. Project Database

## projects

```text
id
user_id
name
description
category
status
priority
start_date
deadline
progress
created_at
updated_at
```

Categories:

```text
PERSONAL
STARTUP
COLLEGE
FREELANCE
OTHER
```

Statuses:

```text
PLANNING
ACTIVE
BLOCKED
ON_HOLD
COMPLETED
ARCHIVED
```

## tasks

```text
id
project_id
user_id
title
description
status
priority
due_date
completed_at
position
created_at
updated_at
```

Task statuses:

```text
BACKLOG
TODO
IN_PROGRESS
BLOCKED
COMPLETED
```

## milestones

```text
id
project_id
name
description
target_date
status
created_at
updated_at
```

---

# 17. Finance Database

Finance requires additional security and careful validation.

## finance_accounts

```text
id
user_id
name
type
currency
current_balance
is_active
created_at
updated_at
```

Types:

```text
CASH
BANK
WALLET
OTHER
```

## income

```text
id
user_id
account_id
amount
currency
source
category
income_date
description
created_at
updated_at
```

## expenses

```text
id
user_id
account_id
amount
currency
category
expense_date
description
payment_method
created_at
updated_at
```

## savings_goals

```text
id
user_id
name
target_amount
current_amount
target_date
status
created_at
updated_at
```

## investments

```text
id
user_id
name
asset_type
amount_invested
current_value
purchase_date
notes
created_at
updated_at
```

For financial data, avoid unnecessary integrations with real bank credentials in V1.

---

# 18. Notification Database

## notification_preferences

```text
id
user_id
channel
category
enabled
created_at
updated_at
```

Channels:

```text
IN_APP
PUSH
EMAIL
```

## notifications

```text
id
user_id
type
title
message
priority
scheduled_at
sent_at
read_at
status
metadata
created_at
updated_at
```

Statuses:

```text
PENDING
SENT
READ
FAILED
CANCELLED
```

---

# 19. Analytics Design

Analytics should generally be generated from source data.

```text
Routine Logs ─────┐
Habit Logs ───────┤
Workout Logs ─────┤
Study Sessions ───┤
Project Tasks ────┤
Finance Records ──┤
                   ▼
             Analytics Engine
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   Productivity  Progress   Finance
```

## Daily Analytics

```text
planned_tasks
completed_tasks
habit_completion_rate
study_minutes
workout_completed
project_tasks_completed
income
expenses
```

## Weekly Analytics

```text
weekly_completion_rate
habit_streaks
study_hours
workout_count
project_progress
financial_summary
```

## Monthly Analytics

```text
monthly_productivity
learning_hours
fitness_trend
project_completion
income
expenses
savings
```

---

# 20. LifeOS Score

A LifeOS score may be used as an optional personal progress indicator.

Example:

```text
Routine       20%
Habits        20%
Fitness       15%
Learning      20%
Projects      15%
Finance       10%
```

Example formula:

```text
daily_score =
    routine_score * 0.20
  + habit_score   * 0.20
  + fitness_score * 0.15
  + learning_score* 0.20
  + project_score * 0.15
  + finance_score * 0.10
```

The score must be transparent.

Users should be able to:

- See how it was calculated
- Change weights
- Disable the score
- View the underlying metrics

The score is a productivity visualization, not a judgment of a person's worth or overall life.

---

# 21. Dashboard Design

The dashboard is the command center.

```text
┌────────────────────────────────────────────────────┐
│ LIFEOS                              Notifications  │
├────────────────────────────────────────────────────┤
│ Good Morning                                       │
│ October 2                                          │
│                                                    │
│ Today's Progress                                   │
│ ███████████████░░░ 78%                            │
│                                                    │
├────────────┬────────────┬────────────┬─────────────┤
│ Habits     │ Fitness    │ Learning   │ Projects    │
│ 5/6        │ Workout ✓  │ 2.5 hrs    │ 3 tasks     │
├────────────┴────────────┴────────────┴─────────────┤
│                                                    │
│ Today's Routine                                    │
│ ✓ Morning Routine                                  │
│ ✓ DSA                                              │
│ ○ Project Work                                     │
│ ○ Gym                                              │
│                                                    │
├────────────────────────┬───────────────────────────┤
│ Weekly Productivity    │ Financial Overview        │
│ Chart                  │ Income / Expense / Saving │
└────────────────────────┴───────────────────────────┘
```

The dashboard should summarize modules rather than recreate every module's full interface.

---

# 22. UX / Navigation Structure

Recommended sidebar:

```text
LifeOS
│
├── Dashboard
│
├── Plan
│   ├── Today
│   ├── Routine
│   └── Tasks
│
├── Track
│   ├── Habits
│   └── Fitness
│
├── Grow
│   └── Learning
│
├── Build
│   └── Projects
│
├── Money
│   └── Finance
│
├── Insights
│   └── Analytics
│
├── Notifications
│
└── Settings
```

This is preferable to showing every database entity directly in the main navigation.

---

# 23. Frontend Folder Structure

```text
frontend/
│
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── login/
│   │   └── register/
│   │
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── routine/
│       ├── habits/
│       ├── fitness/
│       ├── learning/
│       ├── projects/
│       ├── finance/
│       ├── analytics/
│       ├── notifications/
│       └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── routine/
│   ├── habits/
│   ├── fitness/
│   ├── learning/
│   ├── projects/
│   ├── finance/
│   ├── analytics/
│   └── notifications/
│
├── hooks/
├── lib/
├── stores/
├── types/
└── styles/
```

---

# 24. Backend Folder Structure

```text
backend/
│
├── src/
│   │
│   ├── config/
│   │   ├── database.ts
│   │   ├── environment.ts
│   │   └── redis.ts
│   │
│   ├── common/
│   │   ├── guards/
│   │   ├── middleware/
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── utils/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── dashboard/
│   │   ├── routine/
│   │   ├── habits/
│   │   ├── fitness/
│   │   ├── learning/
│   │   ├── projects/
│   │   ├── finance/
│   │   ├── notifications/
│   │   └── analytics/
│   │
│   ├── jobs/
│   │   ├── notifications.job.ts
│   │   └── analytics.job.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   └── schema.prisma
│
└── test/
```

---

# 25. Backend Module Structure

Every major module should follow the same structure.

Example:

```text
habits/
│
├── habits.controller.ts
├── habits.service.ts
├── habits.repository.ts
├── habits.module.ts
├── habits.dto.ts
├── habits.schema.ts
└── habits.types.ts
```

Keep naming consistent across all modules.

---

# 26. API Design

Base path:

```text
/api/v1
```

## Authentication

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

## Dashboard

```http
GET /api/v1/dashboard/summary
GET /api/v1/dashboard/today
```

## Routine

```http
GET    /api/v1/routines
POST   /api/v1/routines
GET    /api/v1/routines/:id
PATCH  /api/v1/routines/:id
DELETE /api/v1/routines/:id

POST /api/v1/routines/:id/items
PATCH /api/v1/routines/items/:itemId
DELETE /api/v1/routines/items/:itemId

POST /api/v1/routines/items/:itemId/log
```

## Habits

```http
GET    /api/v1/habits
POST   /api/v1/habits
GET    /api/v1/habits/:id
PATCH  /api/v1/habits/:id
DELETE /api/v1/habits/:id

POST /api/v1/habits/:id/log
GET  /api/v1/habits/:id/stats
```

## Fitness

```http
GET  /api/v1/fitness/weight
POST /api/v1/fitness/weight

GET  /api/v1/fitness/exercises
POST /api/v1/fitness/exercises

GET  /api/v1/fitness/workouts
POST /api/v1/fitness/workouts
GET  /api/v1/fitness/workouts/:id
PATCH /api/v1/fitness/workouts/:id
```

## Learning

```http
GET  /api/v1/learning/goals
POST /api/v1/learning/goals
PATCH /api/v1/learning/goals/:id
DELETE /api/v1/learning/goals/:id

POST /api/v1/learning/sessions
GET  /api/v1/learning/sessions
```

## Projects

```http
GET  /api/v1/projects
POST /api/v1/projects
GET  /api/v1/projects/:id
PATCH /api/v1/projects/:id
DELETE /api/v1/projects/:id

GET  /api/v1/projects/:id/tasks
POST /api/v1/projects/:id/tasks
PATCH /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
```

## Finance

```http
GET  /api/v1/finance/accounts
POST /api/v1/finance/accounts

GET  /api/v1/finance/income
POST /api/v1/finance/income

GET  /api/v1/finance/expenses
POST /api/v1/finance/expenses

GET  /api/v1/finance/savings
POST /api/v1/finance/savings

GET  /api/v1/finance/investments
POST /api/v1/finance/investments
```

## Analytics

```http
GET /api/v1/analytics/daily
GET /api/v1/analytics/weekly
GET /api/v1/analytics/monthly
GET /api/v1/analytics/productivity
GET /api/v1/analytics/fitness
GET /api/v1/analytics/learning
GET /api/v1/analytics/projects
GET /api/v1/analytics/finance
```

---

# 27. API Response Convention

Use a consistent response structure.

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Request completed successfully"
}
```

Paginated:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": []
  }
}
```

Never expose:

- Password hashes
- Internal secrets
- Stack traces
- Database credentials
- Sensitive internal errors

---

# 28. Authorization Rules

The frontend must never be the final authorization layer.

Correct flow:

```text
Request
  │
  ▼
Authenticate User
  │
  ▼
Find Resource
  │
  ▼
Check resource.user_id
  │
  ├── Matches authenticated user → Allow
  │
  └── Does not match → Reject
```

Example:

```text
GET /api/v1/finance/expenses/123
```

Backend must verify:

```text
expense.user_id === authenticated_user.id
```

before returning the record.

---

# 29. Notification Engine

Modules should publish events rather than directly controlling notification delivery.

Example:

```text
Task deadline approaching
          │
          ▼
      Event Bus
          │
          ▼
Notification Worker
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
  Push  Email  In-App
```

Events:

```text
HABIT_MISSED
HABIT_COMPLETED
TASK_DUE_SOON
TASK_OVERDUE
WORKOUT_SCHEDULED
LEARNING_SESSION_REMINDER
SAVINGS_MILESTONE
PROJECT_DEADLINE
DAILY_REVIEW
WEEKLY_REVIEW
```

---

# 30. Background Jobs

Use a queue/worker system for operations that do not need to block the HTTP request.

Examples:

```text
Daily reminder generation
Notification delivery
Weekly analytics calculation
Monthly reports
Data export
Email delivery
Scheduled cleanup
```

Example:

```text
API
 │
 ├── Save notification job
 │
 ▼
Redis Queue
 │
 ▼
Worker
 │
 ▼
Notification Provider
```

---

# 31. Analytics Pipeline

```text
                 Application Data
                        │
        ┌───────────────┼────────────────┐
        ▼               ▼                ▼
      Routine         Habits           Fitness
        │               │                │
        ├───────────────┼────────────────┤
        ▼               ▼                ▼
    Learning         Projects          Finance
        │               │                │
        └───────────────┼────────────────┘
                        ▼
                Analytics Service
                        │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
         Productivity  Growth   Finance
              │         │         │
              └─────────┼─────────┘
                        ▼
                    Dashboard
```

Prefer computing simple metrics directly from indexed source tables. Introduce materialized views or precomputed analytics tables only when performance requires them.

---

# 32. Database Relationships

Core ER model:

```text
USER
 │
 ├──< ROUTINE
 │      └──< ROUTINE_ITEM
 │              └──< ROUTINE_LOG
 │
 ├──< HABIT
 │      └──< HABIT_LOG
 │
 ├──< WEIGHT_LOG
 │
 ├──< WORKOUT
 │      └──< WORKOUT_EXERCISE
 │              └──< WORKOUT_SET
 │
 ├──< LEARNING_GOAL
 │      └──< LEARNING_TOPIC
 │              └──< LEARNING_SESSION
 │
 ├──< PROJECT
 │      ├──< TASK
 │      └──< MILESTONE
 │
 ├──< FINANCE_ACCOUNT
 │      ├──< INCOME
 │      ├──< EXPENSE
 │      └──< INVESTMENT
 │
 └──< NOTIFICATION
```

`<` means one-to-many.

---

# 33. Important Database Constraints

Use database constraints wherever possible.

Examples:

```text
users.email → UNIQUE

habit_logs:
(habit_id, date) → UNIQUE

routine_logs:
(routine_item_id, date) → UNIQUE
```

Use foreign keys.

Use `NOT NULL` for required fields.

Use appropriate indexes.

Important indexes:

```text
users.email

habits.user_id
habit_logs.user_id
habit_logs.habit_id + date

routine_items.routine_id
routine_logs.user_id + date

weight_logs.user_id + recorded_at

workouts.user_id + started_at

learning_sessions.user_id + started_at

projects.user_id
tasks.project_id

expenses.user_id + expense_date
income.user_id + income_date

notifications.user_id + status
notifications.scheduled_at
```

---

# 34. Time and Date Rules

LifeOS is highly date-dependent.

Every timestamp should be stored consistently, preferably in UTC at the database layer.

The user profile should store:

```text
timezone
```

Example:

```text
Asia/Kolkata
```

Convert timestamps to the user's timezone at the application/UI layer.

Daily calculations must respect the user's timezone.

This is critical for:

- Habit streaks
- Daily routines
- Reminders
- Study sessions
- Workout dates
- Finance reports
- Analytics

---

# 35. Validation Rules

Examples:

### Habit

```text
name: required
name length: reasonable maximum
frequency: valid enum
target_value: positive when provided
```

### Finance

```text
amount > 0
currency valid
date valid
account belongs to user
```

### Workout

```text
reps >= 0
weight >= 0
duration >= 0
exercise exists
```

### Project

```text
deadline >= start_date when both exist
progress between 0 and 100
```

Validation must exist on the backend even if the frontend also validates.

---

# 36. Security Architecture

```text
                    Internet
                       │
                       ▼
                    HTTPS
                       │
                       ▼
                Reverse Proxy
                       │
                       ▼
                 API Server
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Auth Guard   Validation    Rate Limit
          │            │            │
          └────────────┼────────────┘
                       ▼
                   Services
                       │
                       ▼
                  PostgreSQL
```

Security checklist:

- HTTPS
- Secure authentication
- Password hashing
- Authorization checks
- Input validation
- SQL injection protection through ORM/parameterization
- Rate limiting
- CORS configuration
- CSRF protection where applicable
- Secure cookies/tokens
- Security headers
- Secret management
- Audit logs for sensitive administrative actions
- Database backups
- Error monitoring

Reference: OWASP Cheat Sheet Series:
https://cheatsheetseries.owasp.org/

---

# 37. Environment Variables

Example:

```env
NODE_ENV=development

DATABASE_URL=
REDIS_URL=

AUTH_SECRET=
JWT_SECRET=

APP_URL=

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

EMAIL_HOST=
EMAIL_USER=
EMAIL_PASSWORD=

SENTRY_DSN=
```

Never commit:

```text
.env
.env.local
production secrets
private keys
API keys
database passwords
```

Add them to `.gitignore`.

---

# 38. Docker Architecture

Development:

```text
Docker Compose
│
├── frontend
├── backend
├── postgres
└── redis
```

Example:

```text
┌─────────────────────────────────┐
│         Docker Compose          │
│                                 │
│  ┌─────────┐  ┌─────────────┐ │
│  │ Next.js │  │ NestJS API  │ │
│  └─────────┘  └──────┬──────┘ │
│                      │        │
│          ┌───────────┴──────┐ │
│          ▼                  ▼ │
│     PostgreSQL            Redis│
│                               │
└───────────────────────────────┘
```

---

# 39. Deployment Architecture

Production:

```text
                   Users
                     │
                     ▼
              CDN / HTTPS
                     │
                     ▼
             Next.js Application
                     │
                     ▼
                API Server
                /         \
               /           \
              ▼             ▼
        PostgreSQL         Redis
              │             │
              │             ▼
              │          Workers
              │             │
              └─────────────┘
                     │
                     ▼
              Object Storage
```

---

# 40. Git Repository Structure

Recommended monorepo:

```text
lifeos/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── config/
│   ├── types/
│   └── validation/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   └── security.md
│
├── docker/
│
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

If a monorepo feels unnecessarily complex during V1, start with separate `frontend/` and `backend/` directories and migrate later.

---

# 41. Git Branch Strategy

```text
main
 │
 ├── develop
 │
 ├── feature/auth
 ├── feature/habits
 ├── feature/fitness
 ├── feature/learning
 ├── feature/projects
 ├── feature/finance
 └── feature/analytics
```

Recommended commit style:

```text
feat: add habit tracking
fix: correct daily streak calculation
refactor: separate analytics service
docs: update database schema
test: add habit service tests
```

---

# 42. Development Roadmap

## Phase 0 — Planning

Deliverables:

- Product specification
- User flows
- Wireframes
- ER diagram
- API specification
- Technology decisions

---

## Phase 1 — Project Foundation

Build:

- Repository
- Next.js app
- Backend
- PostgreSQL
- Prisma
- Docker
- Environment configuration
- CI pipeline
- Base UI

---

## Phase 2 — Authentication

Build:

- Registration
- Login
- Logout
- Session handling
- Protected routes
- User profile

Acceptance criteria:

```text
User can register
User can login
User can logout
Private routes reject unauthenticated users
```

---

## Phase 3 — Dashboard

Build:

- Layout
- Sidebar
- Header
- Today overview
- Progress cards
- Notification panel
- Basic analytics widgets

---

## Phase 4 — Routine

Build:

- Routine creation
- Routine items
- Time blocks
- Daily view
- Completion
- Recurrence
- Routine logs

---

## Phase 5 — Habits

Build:

- Create habit
- Edit habit
- Delete/archive habit
- Daily completion
- Streak calculation
- Habit analytics

---

## Phase 6 — Fitness

Build:

- Weight logging
- Exercise library
- Workout creation
- Sets/reps
- Workout history
- Progress charts

---

## Phase 7 — Learning

Build:

- Learning goals
- Topics
- Study sessions
- Learning timer
- Learning analytics

---

## Phase 8 — Projects

Build:

- Project CRUD
- Task CRUD
- Status management
- Priority
- Deadlines
- Milestones
- Progress tracking

---

## Phase 9 — Finance

Build:

- Accounts
- Income
- Expenses
- Savings goals
- Investments
- Financial dashboard
- Monthly reports

Treat this module as sensitive and add additional security/testing before production use.

---

## Phase 10 — Notifications

Build:

- Notification preferences
- Scheduled reminders
- Task deadline reminders
- Habit reminders
- Daily review
- Weekly review
- In-app notifications
- Push notifications

---

## Phase 11 — Analytics

Build:

- Daily analytics
- Weekly analytics
- Monthly analytics
- Productivity
- Habit consistency
- Learning
- Fitness
- Projects
- Finance

---

## Phase 12 — Production Hardening

Before public deployment:

- Security audit
- Input validation review
- Authorization review
- Database indexes
- Error handling
- Logging
- Backups
- Monitoring
- Rate limiting
- Performance testing
- Accessibility testing
- Mobile responsiveness

---

# 43. Testing Strategy

## Unit Tests

Test:

- Services
- Utility functions
- Score calculation
- Streak calculation
- Financial calculations
- Analytics calculations

## Integration Tests

Test:

```text
API → Service → Database
```

Examples:

- Create habit
- Complete habit
- Create expense
- Create workout
- Create project task

## End-to-End Tests

Test complete user flows:

```text
Register
 ↓
Create routine
 ↓
Complete routine
 ↓
Create habit
 ↓
Complete habit
 ↓
Open dashboard
 ↓
See updated analytics
```

Recommended tooling:

- Vitest/Jest
- Supertest
- Playwright

---

# 44. API Security Testing

Test:

```text
Unauthenticated request
Cross-user resource access
Invalid IDs
Invalid input
Expired session
Rate limits
Malformed payloads
Unauthorized finance access
```

Example critical test:

```text
User A must never access User B's:

habits
finance records
workouts
learning sessions
projects
notifications
```

---

# 45. Performance Strategy

Do not optimize everything prematurely.

Start with:

- Database indexes
- Pagination
- Efficient queries
- Server-side filtering
- Lazy loading
- Image optimization
- Caching expensive dashboard queries

Later:

```text
PostgreSQL
    │
    ├── Indexes
    ├── Materialized Views
    └── Query Optimization

Redis
    │
    └── Cache
```

---

# 46. Offline / PWA Strategy

A future PWA can support:

- Viewing today's routine
- Habit completion
- Basic task updates
- Local temporary storage
- Sync when online

Architecture:

```text
User
 │
 ▼
PWA
 │
 ├── Local Cache
 │
 └── Sync Queue
       │
       ▼
     API
```

Do not make the entire system offline-first in V1.

---

# 47. AI Layer — Future

AI should be added only after reliable structured data exists.

Potential features:

## AI Daily Assistant

User:

> "What should I focus on today?"

System analyzes:

- Deadlines
- Routine
- Habits
- Projects
- Learning goals
- Available time

Then generates suggestions.

## Natural Language Input

```text
"Add 1 hour of DSA tomorrow at 8 AM."
```

AI converts this into structured data:

```json
{
  "type": "routine_item",
  "title": "DSA",
  "duration": 60,
  "date": "tomorrow",
  "start_time": "08:00"
}
```

The application should validate the structured result before saving it.

## AI Weekly Review

```text
This week:
- 17 study hours
- 4 workouts
- 82% habit completion
- 11 project tasks completed
```

Then provide observations and user-controlled suggestions.

AI must not silently modify important user data.

---

# 48. Future LifeOS Intelligence Engine

Potential architecture:

```text
                    LifeOS Data
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
       Analytics Engine          AI Engine
             │                       │
             └───────────┬───────────┘
                         ▼
                  Personal Insights
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Today       This Week    Long Term
             │           │           │
             └───────────┼───────────┘
                         ▼
                   User Dashboard
```

---

# 49. Important Product Rule: User Control

LifeOS should not become a system that constantly interrupts the user.

Notification priorities:

```text
Critical
   ↓
Important
   ↓
Useful
   ↓
Optional
```

Users should be able to configure:

- Notification channels
- Quiet hours
- Reminder frequency
- Categories
- Daily summary
- Weekly summary

---

# 50. Design System

## Visual Direction

LifeOS should feel:

- Minimal
- Modern
- Calm
- Professional
- Data-oriented
- Personal

Avoid:

- Excessive gradients
- Too many colors
- Overloaded dashboards
- Too many animations
- Gamification everywhere

## UI Components

Create reusable:

```text
Button
Input
Select
Modal
Drawer
Card
Stat Card
Chart Card
Progress Bar
Progress Ring
Calendar
Data Table
Timeline
Task Item
Habit Card
Workout Card
Finance Card
Notification Item
Empty State
Loading State
Error State
```

---

# 51. Responsive Design

Breakpoints should support:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Mobile navigation:

```text
Dashboard
Today
Track
Add
Analytics
```

Desktop:

```text
Sidebar
Dashboard
```

The most important mobile experience is quick logging:

- Complete habit
- Add expense
- Log weight
- Start study session
- Complete task
- Start workout

---

# 52. Accessibility

Follow WCAG principles.

Requirements:

- Keyboard navigation
- Visible focus states
- Semantic HTML
- Accessible forms
- Labels for inputs
- Sufficient contrast
- Alternative text
- Screen-reader-friendly navigation
- Avoid color-only status indicators

Reference:
https://www.w3.org/WAI/standards-guidelines/wcag/

---

# 53. Data Export

Users should eventually be able to export their data.

Formats:

```text
JSON
CSV
PDF
```

Export categories:

```text
All Data
Habits
Fitness
Learning
Projects
Finance
Analytics
```

Example:

```text
LifeOS Export
│
├── profile.json
├── habits.json
├── fitness.json
├── learning.json
├── projects.json
├── finance.json
└── analytics.json
```

---

# 54. Backup Strategy

Production database:

```text
Primary PostgreSQL
        │
        ▼
Scheduled Backups
        │
        ▼
Encrypted Backup Storage
```

Backup policy should define:

- Frequency
- Retention
- Encryption
- Restore testing

A backup is only useful if restoration is tested.

---

# 55. Observability

Track:

```text
Application Errors
API Latency
Database Errors
Queue Failures
Notification Failures
Authentication Failures
Server Health
```

Use structured logs.

Example:

```json
{
  "level": "error",
  "service": "habits",
  "operation": "completeHabit",
  "userId": "...",
  "error": "..."
}
```

Do not log sensitive financial details, passwords, tokens, or unnecessary personal information.

---

# 56. Important Business Rules

## Habit Streak

A streak increments when required completion criteria are satisfied according to the habit's frequency.

Do not calculate streaks only from consecutive calendar rows without considering the habit schedule.

## Project Progress

Default:

```text
completed_tasks / total_tasks * 100
```

Allow manual progress for projects where task count is not meaningful.

## Savings

```text
Savings = Income - Expenses
```

Do not confuse savings with account balance.

## Learning Time

```text
learning_minutes =
sum(completed learning sessions)
```

## Workout Frequency

```text
workout_frequency =
completed_workouts / selected_period
```

---

# 57. Core Domain Event Model

A useful future abstraction is an activity/event layer.

Examples:

```text
ROUTINE_COMPLETED
HABIT_COMPLETED
WORKOUT_COMPLETED
LEARNING_SESSION_COMPLETED
TASK_COMPLETED
EXPENSE_CREATED
INCOME_CREATED
PROJECT_COMPLETED
```

These events can feed:

```text
Analytics
Notifications
Activity Feed
Achievements
AI Insights
```

This is one of the most important long-term architectural extensions.

---

# 58. Activity Timeline

Future feature:

```text
Today
│
├── 07:30 ✓ DSA completed
├── 09:30 ✓ Breakfast
├── 14:00 ✓ LifeOS development
├── 17:30 ✓ Workout
├── 19:30 ✓ Guitar practice
└── 21:00 ✓ Daily review
```

This gives the user a chronological view of their day.

---

# 59. Daily Review

At the end of the day:

```text
Daily Review
│
├── Tasks completed
├── Habits completed
├── Learning time
├── Workout
├── Project progress
├── Expenses
└── Reflection
```

Optional reflection:

```text
What went well?
What did not go well?
What should change tomorrow?
```

---

# 60. Weekly Review

```text
Weekly Review
│
├── Productivity
├── Habits
├── Fitness
├── Learning
├── Projects
├── Finance
└── Reflection
```

Example:

```text
Weekly Summary

Habits             86%
Learning           11.5 hrs
Workouts           4
Tasks              31 completed
Projects           72% average progress
Savings            ₹X,XXX
```

---

# 61. Analytics Dashboard Layout

```text
Analytics
│
├── Overview
│
├── Productivity
│   ├── Tasks
│   ├── Routine
│   └── Habits
│
├── Fitness
│   ├── Weight
│   ├── Workouts
│   └── Strength
│
├── Learning
│   ├── Hours
│   ├── Subjects
│   └── Consistency
│
├── Projects
│   ├── Completion
│   ├── Deadlines
│   └── Velocity
│
└── Finance
    ├── Income
    ├── Expenses
    ├── Savings
    └── Trends
```

---

# 62. MVP Acceptance Criteria

LifeOS V1 is considered functional when:

## Authentication

- [ ] User can register
- [ ] User can log in
- [ ] User can log out
- [ ] Protected routes work
- [ ] User can manage profile

## Routine

- [ ] Create routine
- [ ] Add routine items
- [ ] Mark items complete
- [ ] View today's routine
- [ ] Track completion

## Habits

- [ ] Create habit
- [ ] Complete habit
- [ ] View streak
- [ ] View habit history

## Fitness

- [ ] Log weight
- [ ] Create workout
- [ ] Record exercises
- [ ] Record sets/reps
- [ ] View progress

## Learning

- [ ] Create learning goal
- [ ] Add topics
- [ ] Track study sessions
- [ ] View learning time

## Projects

- [ ] Create project
- [ ] Create tasks
- [ ] Update task status
- [ ] Track progress

## Finance

- [ ] Create account
- [ ] Add income
- [ ] Add expense
- [ ] View balance/summary
- [ ] View reports

## Notifications

- [ ] Configure preferences
- [ ] Schedule reminder
- [ ] Show in-app notification

## Analytics

- [ ] Daily summary
- [ ] Weekly summary
- [ ] Basic charts
- [ ] Cross-module dashboard

---

# 63. Recommended Build Order

Build exactly in this sequence:

```text
1. Project setup
       ↓
2. Database
       ↓
3. Authentication
       ↓
4. Dashboard shell
       ↓
5. Routine
       ↓
6. Habits
       ↓
7. Fitness
       ↓
8. Learning
       ↓
9. Projects
       ↓
10. Finance
       ↓
11. Notifications
       ↓
12. Analytics
       ↓
13. Testing
       ↓
14. Security hardening
       ↓
15. Deployment
       ↓
16. PWA
       ↓
17. AI features
```

Do not start with AI.

First make the underlying life-data system reliable.

---

# 64. Recommended First Release Architecture

For the first serious release:

```text
Frontend
Next.js
TypeScript
Tailwind
shadcn/ui

Backend
NestJS
TypeScript
Prisma

Database
PostgreSQL

Infrastructure
Docker
Docker Compose

Cache/Queue
Redis

Testing
Vitest/Jest
Playwright

CI/CD
GitHub Actions

Monitoring
Sentry

Deployment
Cloud/VPS
```

---

# 65. Final Architecture

```text
                              LIFEOS
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
            USER INTERFACE                MOBILE/PWA
                 │                             │
                 └──────────────┬──────────────┘
                                │
                              HTTPS
                                │
                                ▼
                       ┌─────────────────┐
                       │    API LAYER    │
                       └────────┬────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
          ▼                     ▼                      ▼
     Authentication       Core Modules           Analytics
          │                     │                      │
          │          ┌──────────┼───────────┐          │
          │          │          │           │          │
          │          ▼          ▼           ▼          │
          │       Routine     Habits      Fitness      │
          │          │          │           │          │
          │          ▼          ▼           ▼          │
          │       Learning   Projects     Finance      │
          │          │          │           │          │
          │          └──────────┼───────────┘          │
          │                     │                      │
          └─────────────────────┼──────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
               PostgreSQL                Redis
                    │                       │
                    │                 Queue / Cache
                    │                       │
                    └───────────┬───────────┘
                                ▼
                       Background Workers
                                │
                     ┌──────────┴─────────┐
                     ▼                    ▼
                  Push/Email          Analytics Jobs
```

---

# 66. Final Product Vision

LifeOS should ultimately become:

```text
                 ┌─────────────────────┐
                 │       LIFEOS        │
                 │                     │
                 │   PLAN              │
                 │     ↓               │
                 │   EXECUTE            │
                 │     ↓               │
                 │   TRACK              │
                 │     ↓               │
                 │   ANALYZE            │
                 │     ↓               │
                 │   REFLECT            │
                 │     ↓               │
                 │   IMPROVE             │
                 │     │                │
                 │     └───────► PLAN   │
                 └─────────────────────┘
```

The core loop is:

**Plan → Execute → Track → Analyze → Reflect → Improve → Repeat**

That loop is the central product concept behind LifeOS.

---

# 67. Engineering Rules for the Project

1. Do not duplicate business logic between frontend and backend.
2. Backend authorization is mandatory.
3. Every user-owned record must have clear ownership.
4. Use PostgreSQL as the source of truth.
5. Use Redis only where caching/queues are useful.
6. Keep modules independent but connected through well-defined services/events.
7. Do not add microservices prematurely.
8. Do not add AI before reliable structured data exists.
9. Keep financial data especially protected.
10. Store timestamps consistently and respect user timezone.
11. Use database constraints in addition to application validation.
12. Write tests for calculations and business rules.
13. Keep API naming consistent.
14. Keep frontend components reusable.
15. Document major architecture decisions.
16. Never commit secrets.
17. Back up production data.
18. Test restoration.
19. Monitor errors after deployment.
20. Update this specification when architecture changes.

---

# 68. Definition of Done for Every Feature

A feature is not considered complete merely because its UI works.

For every module:

```text
UI
 ↓
API
 ↓
Validation
 ↓
Business Logic
 ↓
Database
 ↓
Authorization
 ↓
Error Handling
 ↓
Loading States
 ↓
Empty States
 ↓
Tests
 ↓
Analytics integration where relevant
 ↓
Documentation
```

Only then should the feature be marked complete.

---

# 69. Project Success Definition

LifeOS succeeds technically when:

- The system has a clean modular architecture
- Data relationships are consistent
- User data is isolated securely
- Core workflows work end-to-end
- Analytics are based on reliable source data
- Notifications run through controlled background jobs
- The application is responsive
- The system can be deployed reproducibly
- Tests cover important business logic
- New modules can be added without rewriting the entire application

The project should demonstrate:

```text
Frontend Engineering
+
Backend Engineering
+
Database Design
+
Authentication
+
Authorization
+
API Design
+
Background Jobs
+
Analytics
+
Security
+
Testing
+
Docker
+
CI/CD
+
System Design
```

That makes LifeOS not merely a CRUD project, but a complete full-stack engineering project with a clear path toward an intelligent personal operating system.

---

# 70. Reference Sources

Use these as technical references during implementation:

- OWASP Cheat Sheet Series: https://cheatsheetseries.owasp.org/
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Next.js Documentation: https://nextjs.org/docs
- React Documentation: https://react.dev/
- TypeScript Documentation: https://www.typescriptlang.org/docs/
- NestJS Documentation: https://docs.nestjs.com/
- Prisma Documentation: https://www.prisma.io/docs
- Redis Documentation: https://redis.io/docs/
- Docker Documentation: https://docs.docker.com/
- GitHub Actions Documentation: https://docs.github.com/en/actions
- Playwright Documentation: https://playwright.dev/docs
- WCAG / W3C Accessibility Guidelines: https://www.w3.org/WAI/standards-guidelines/wcag/

---

# 71. Document Status

**Project:** LifeOS  
**Document:** Master Product & Technical Specification  
**Architecture:** Modular Monolith  
**Primary Database:** PostgreSQL  
**Frontend:** Next.js + TypeScript  
**Backend:** NestJS + TypeScript  
**ORM:** Prisma  
**Cache/Queue:** Redis  
**Deployment:** Docker-based  
**Status:** Architecture Reference / V1 Planning

> Any major technical change should be documented here before implementation.

---

# 72. V1 Implementation Decisions

Recorded during the V1 build (October 2026), per the rule that architectural changes are
documented here. Details live in `docs/`.

## Data model additions

- **`user_settings`** — LifeOS score on/off and weights (§20), quiet hours and daily/weekly
  summaries (§49), daily study goal, display currency.
- **`sessions`** — hashed, rotating refresh tokens with reuse detection (§9).
- **`projects.auto_progress`** — progress follows `completed_tasks / total_tasks` unless the
  user sets it manually (§56).
- **`notifications.dedupe_key`** — unique per user; makes background reminder generation idempotent.
- Status/category fields are PostgreSQL enums; money is `DECIMAL(14,2)` with positive-amount
  checks; time-of-day fields are local `"HH:mm"` strings; log dates are `DATE` in the user's
  timezone (§34). `exercises.name` is unique; the library is seeded.
- Table names keep Prisma's default PascalCase rather than the snake_case shown in §11–18.

## Behavioural rules

- **Habits** — `frequency_type` ∈ `DAILY | WEEKDAYS | WEEKLY`; for `WEEKLY`, `target_value` is
  completions per week. Streaks skip unscheduled days, count weeks for weekly habits, and an
  unfinished current period never breaks a streak. Completion windows start at the habit's
  creation date or its earliest logged completion, whichever is earlier.
- **Routine recurrence** — `DAILY | WEEKDAYS | WEEKENDS | WEEKLY:MO,WE,...`.
- **Learning** — a goal with topics shows the average of topic progress.
- **Finance** — account balance = opening balance + income − expenses, updated in the same DB
  transaction; savings remain income − expenses (§56).
- **LifeOS score** — components with no data for the day are excluded and the remaining weights
  renormalized; every component returns its explanation. Fitness uses workouts in the trailing 7
  days against a target of 3; finance uses the month-to-date savings rate.
- **Analytics** — computed on demand from source tables (§31); days with nothing scheduled
  report `null` rather than 0%.

## Architecture

- Repository layer = `PrismaService` (no separate repository classes).
- Global deny-by-default JWT guard with `@Public()` opt-out; global throttler; response envelope
  interceptor and error filter (§27).
- In-process domain event bus (§57) feeds achievement notifications.
- Reminder worker: BullMQ job scheduler on Redis, every 60 s (§30). V1 delivers **in-app**
  only; push and email are V1.5.
- The browser talks only to the Next.js origin, which proxies `/api/v1/*` to the API
  (first-party cookies, no CORS). Next.js 16 `proxy.ts` handles optimistic auth redirects.
- Deployment: `docker compose --profile app` (Nginx → web → api, with Postgres and Redis).

## Installable app & sessions (V1.5 start)

- **PWA** — `app/manifest.ts` declares `display: fullscreen` (falling back to standalone) with the
  brand icons from `Logos/`; installed LifeOS opens without browser UI. A service worker caches
  only the app shell and an offline page — API responses are never cached (personal data).
  An in-app full-screen toggle uses the Fullscreen API when running in a normal tab.
- **Keep me logged in** — `sessions.persistent`. Checked (default): 30-day cookie that survives
  closing the browser/app. Unchecked: browser-session cookie, server TTL 12 h. The choice is kept
  across token rotation, every refresh slides the window, and an open app renews its access
  token before expiry and on resume from background.
- **Serverless hosting (Vercel)** — the API also runs as a Vercel Function: compiled with
  `nest build` and served through a plain-JS entry (esbuild would drop NestJS decorator metadata).
  The BullMQ worker is replaced there by Vercel Cron calling `GET /api/v1/jobs/reminders`
  (secured with `CRON_SECRET`); the reminder generator is idempotent, so missed or duplicate
  invocations are safe. The web proxy forwards the visitor IP with `PROXY_SECRET` so rate
  limits stay per-visitor behind Vercel. See `docs/deploy-vercel.md`.
- **Branding** — the full logo appears on a white tile (landing, sign-in) so it reads in both
  themes; a transparent leaf emblem cut from it is the small mark in navigation.
