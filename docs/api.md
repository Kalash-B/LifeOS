# LifeOS API (v1)

Base path `/api/v1`. Interactive docs (non-production): `http://localhost:4000/api/docs`.

All routes require `Authorization: Bearer <accessToken>` except those marked *public*.

**Envelope** — success `{ "success": true, "data": … }`, paginated adds `"meta": {page, limit, total, totalPages}`,
errors `{ "success": false, "error": { "code", "message", "details": [] } }`.
Codes: `VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 ·
`CONFLICT` 409 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500.
A resource owned by another user is always `404` (its existence is never revealed).

Dates: `YYYY-MM-DD` = a calendar date in the user's timezone; `HH:mm` = local time of day;
everything else is ISO-8601 UTC. Money is a number with ≤ 2 decimals.

| Area | Endpoints |
|---|---|
| Health | `GET /health` *public* |
| Auth | `POST /auth/register` *public* · `POST /auth/login` *public* · `POST /auth/refresh` *public, cookie* · `POST /auth/logout` *public* · `GET /auth/me` |
| Users | `GET/PATCH /users/me` · `GET/PATCH /users/me/settings` · `POST /users/me/password` · `GET /users/me/export` · `DELETE /users/me` |
| Dashboard | `GET /dashboard/today` · `GET /dashboard/summary` |
| Routine | `GET/POST /routines` · `GET /routines/today?date=` · `GET /routines/history` · `GET/PATCH/DELETE /routines/:id` · `POST /routines/:id/items` · `PATCH/DELETE /routines/items/:itemId` · `POST /routines/items/:itemId/log` |
| Habits | `GET /habits?includeArchived=` · `POST /habits` · `GET/PATCH/DELETE /habits/:id` · `POST /habits/:id/log` · `GET /habits/:id/stats` |
| Fitness | `GET/POST /fitness/weight` · `DELETE /fitness/weight/:id` · `GET /fitness/exercises?q=` · `POST /fitness/exercises` · `GET/POST /fitness/workouts` · `GET/PATCH/DELETE /fitness/workouts/:id` · `GET /fitness/progress` |
| Learning | `GET/POST /learning/goals` · `GET/PATCH/DELETE /learning/goals/:id` · `POST /learning/goals/:id/topics` · `PATCH/DELETE /learning/topics/:id` · `GET/POST /learning/sessions` · `DELETE /learning/sessions/:id` · `GET /learning/stats` |
| Projects | `GET/POST /projects` · `GET/PATCH/DELETE /projects/:id` · `GET/POST /projects/:id/tasks` · `POST /projects/:id/milestones` · `GET /tasks?view=today\|overdue\|week\|open&status=&projectId=` · `PATCH/DELETE /tasks/:id` · `PATCH/DELETE /milestones/:id` |
| Finance | `GET /finance/summary?month=YYYY-MM` · `GET/POST /finance/accounts` · `PATCH/DELETE /finance/accounts/:id` · `GET/POST /finance/income` · `DELETE /finance/income/:id` · `GET/POST /finance/expenses` · `DELETE /finance/expenses/:id` · `GET/POST /finance/savings` · `PATCH/DELETE /finance/savings/:id` · `GET/POST /finance/investments` · `PATCH/DELETE /finance/investments/:id` |
| Notifications | `GET /notifications?page=&limit=&unread=` · `GET /notifications/unread-count` · `GET /notifications/scheduled` · `POST /notifications/reminders` · `POST /notifications/read-all` · `PATCH /notifications/:id/read` · `DELETE /notifications/:id` · `GET/PUT /notifications/preferences` |
| Analytics | `GET /analytics/daily?date=` · `/weekly` · `/monthly?month=` · `/productivity?days=` · `/score?date=` · `/fitness` · `/learning` · `/projects` · `/finance` |

Rate limits (per client IP per minute): 300 globally, 10 for register/login, 60 for refresh,
5 for password change, 3 for export/account deletion.
