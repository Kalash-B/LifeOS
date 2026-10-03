// Response shapes of the LifeOS API (apps/api). Dates arrive as ISO strings.

export type Id = string;

export interface User {
  id: Id;
  email: string;
  role: "USER" | "ADMIN";
  status: string;
  timezone: string;
  createdAt: string;
  profile: { displayName: string | null; avatarUrl: string | null; bio: string | null } | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export type ScoreComponent = "routine" | "habits" | "fitness" | "learning" | "projects" | "finance";
export type ScoreWeights = Record<ScoreComponent, number>;

export interface UserSettings {
  scoreEnabled: boolean;
  scoreWeights: ScoreWeights;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  dailySummary: boolean;
  weeklySummary: boolean;
  dailyStudyGoalMin: number;
  currency: string;
}

export interface Me extends Omit<User, "profile"> {
  profile: {
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    dateOfBirth: string | null;
    preferredLanguage: string | null;
  } | null;
  settings: UserSettings;
}

// ─── Routine ────────────────────────────────────────────────────────────────
export type LogStatus = "PENDING" | "COMPLETED" | "SKIPPED" | "MISSED";

export interface RoutineItem {
  id: Id;
  routineId: Id;
  title: string;
  description: string | null;
  category: string | null;
  startTime: string | null;
  endTime: string | null;
  priority: number | null;
  recurrenceRule: string | null;
  position: number;
}

export interface Routine {
  id: Id;
  name: string;
  description: string | null;
  isActive: boolean;
  routineItems: RoutineItem[];
}

export interface RoutineDayItem extends RoutineItem {
  routineName: string;
  status: LogStatus;
  completedAt: string | null;
}

export interface RoutineDay {
  date: string;
  items: RoutineDayItem[];
  total: number;
  completed: number;
  completionRate: number;
}

// ─── Habits ─────────────────────────────────────────────────────────────────
export type HabitFrequency = "DAILY" | "WEEKDAYS" | "WEEKLY";

export interface Streak {
  current: number;
  best: number;
  unit: "day" | "week";
  completedCurrentPeriod: boolean;
}

export interface Habit {
  id: Id;
  name: string;
  description: string | null;
  frequencyType: HabitFrequency;
  targetValue: number | null;
  unit: string | null;
  reminderTime: string | null;
  isActive: boolean;
  createdAt: string;
  todayStatus: LogStatus;
  todayValue: number | null;
  scheduledToday: boolean;
  streak: Streak;
  completionRate30: number;
  last7: { date: string; status: LogStatus | null; scheduled: boolean }[];
}

export interface HabitStats {
  habitId: Id;
  streak: Streak;
  completionRate7: number;
  completionRate30: number;
  totalCompletions: number;
  history: { date: string; status: LogStatus; value: number | null; notes: string | null }[];
}

// ─── Fitness ────────────────────────────────────────────────────────────────
export interface Exercise {
  id: Id;
  name: string;
  muscleGroup: string | null;
  equipment: string | null;
}

export interface WorkoutSet {
  id: Id;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  duration: number | null;
  completed: boolean;
}

export interface Workout {
  id: Id;
  name: string;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  durationMinutes: number | null;
  volume: number;
  totalSets: number;
  exercises: { id: Id; exerciseId: Id; orderIndex: number; notes: string | null; exercise: Exercise; sets: WorkoutSet[] }[];
}

export interface WeightLog {
  id: Id;
  weight: number;
  unit: string;
  recordedAt: string;
  notes: string | null;
}

export interface FitnessProgress {
  weight: { series: { date: string; weight: number; unit: string }[]; latest: number | null; change: number | null; unit: string };
  weekly: { week: string; workouts: number; volume: number }[];
  workoutsThisWeek: number;
  averagePerWeek: number;
  personalRecords: { exerciseId: Id; name: string; maxWeight: number; bestOneRepMax: number; achievedAt: string }[];
}

// ─── Learning ───────────────────────────────────────────────────────────────
export type LearningStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface LearningTopic {
  id: Id;
  learningGoalId: Id;
  name: string;
  description: string | null;
  status: LearningStatus;
  progress: number;
  position: number;
}

export interface LearningGoal {
  id: Id;
  name: string;
  description: string | null;
  category: string;
  targetDate: string | null;
  status: LearningStatus;
  progress: number;
  topics: LearningTopic[];
  totalMinutes: number;
  sessionCount: number;
}

export interface LearningSession {
  id: Id;
  learningGoalId: Id;
  learningTopicId: Id | null;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number;
  productivityRating: number | null;
  notes: string | null;
  learningGoal: { id: Id; name: string; category: string };
  learningTopic: { id: Id; name: string } | null;
}

export interface LearningStats {
  today: number;
  dailyGoalMinutes: number;
  periodMinutes: number;
  periodDays: number;
  sessionCount: number;
  averageProductivity: number | null;
  studyStreakDays: number;
  daily: { date: string; minutes: number }[];
  byGoal: { goalId: Id; name: string; minutes: number }[];
}

// ─── Projects ───────────────────────────────────────────────────────────────
export type ProjectCategory = "PERSONAL" | "STARTUP" | "COLLEGE" | "FREELANCE" | "OTHER";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "BLOCKED" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type MilestoneStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "MISSED";

export interface Task {
  id: Id;
  projectId: Id;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority | null;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  project?: { id: Id; name: string; category: ProjectCategory };
}

export interface Milestone {
  id: Id;
  projectId: Id;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: MilestoneStatus;
}

export interface Project {
  id: Id;
  name: string;
  description: string | null;
  category: ProjectCategory;
  status: ProjectStatus;
  priority: Priority | null;
  startDate: string | null;
  deadline: string | null;
  progress: number;
  autoProgress: boolean;
  createdAt: string;
}

export interface ProjectListItem extends Project {
  taskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  milestoneCount: number;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
  milestones: Milestone[];
}

// ─── Finance ────────────────────────────────────────────────────────────────
export type AccountType = "CASH" | "BANK" | "WALLET" | "OTHER";

export interface FinanceAccount {
  id: Id;
  name: string;
  type: AccountType;
  currency: string;
  currentBalance: number;
  isActive: boolean;
}

export interface Income {
  id: Id;
  accountId: Id;
  amount: number;
  currency: string;
  source: string;
  category: string;
  incomeDate: string;
  description: string | null;
  account: { id: Id; name: string };
}

export interface Expense {
  id: Id;
  accountId: Id;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string;
  description: string | null;
  paymentMethod: string | null;
  account: { id: Id; name: string };
}

export interface SavingsGoal {
  id: Id;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  status: "ACTIVE" | "ACHIEVED" | "CANCELLED";
}

export interface Investment {
  id: Id;
  name: string;
  assetType: string;
  amountInvested: number;
  currentValue: number;
  purchaseDate: string | null;
  notes: string | null;
}

export interface FinanceSummary {
  month: string;
  currency: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number | null;
  totalBalance: number;
  accountCount: number;
  expensesByCategory: { category: string; amount: number }[];
  trend: { month: string; income: number; expenses: number; savings: number }[];
  savingsGoals: { count: number; target: number; saved: number };
  investments: { invested: number; currentValue: number; gain: number };
}

// ─── Notifications ──────────────────────────────────────────────────────────
export type NotificationPriority = "CRITICAL" | "IMPORTANT" | "USEFUL" | "OPTIONAL";

export interface AppNotification {
  id: Id;
  type: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  scheduledAt: string | null;
  sentAt: string | null;
  readAt: string | null;
  status: "PENDING" | "SENT" | "READ" | "FAILED" | "CANCELLED";
  metadata: Record<string, unknown> | null;
}

export interface NotificationPreferences {
  channels: { channel: "IN_APP" | "PUSH" | "EMAIL"; available: boolean; enabled: boolean }[];
  categories: { category: string; enabled: boolean }[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Analytics ──────────────────────────────────────────────────────────────
export interface ScoreBreakdownItem {
  component: ScoreComponent;
  value: number | null;
  score: number | null;
  configuredWeight: number;
  effectiveWeight: number;
  contribution: number;
  explanation: string;
}

export interface ScoreResult {
  score: number | null;
  breakdown: ScoreBreakdownItem[];
  excluded: ScoreComponent[];
}

export interface CompactDay {
  date: string;
  /** null when nothing was scheduled that day */
  routineRate: number | null;
  habitRate: number | null;
  studyMinutes: number;
  workouts: number;
  tasksCompleted: number;
  income: number;
  expenses: number;
  score: number | null;
}

export interface WeeklyAnalytics {
  from: string;
  to: string;
  weeklyCompletionRate: number;
  habitCompletionRate: number;
  studyHours: number;
  workoutCount: number;
  tasksCompleted: number;
  projectProgress: number | null;
  financialSummary: { income: number; expenses: number; savings: number };
  averageScore: number | null;
  days: CompactDay[];
}

export interface MonthlyAnalytics {
  month: string;
  monthlyProductivity: number;
  habitCompletionRate: number;
  learningHours: number;
  workoutCount: number;
  fitnessTrend: number | null;
  tasksCompleted: number;
  projectsCompleted: number;
  income: number;
  expenses: number;
  savings: number;
  averageScore: number | null;
  days: CompactDay[];
}

export interface ProjectsAnalytics {
  total: number;
  byStatus: Record<string, number>;
  averageProgress: number;
  upcomingDeadlines: { id: Id; name: string; deadline: string; progress: number; status: ProjectStatus }[];
  overdue: number;
  velocity: { week: string; completed: number }[];
}

export interface DashboardToday {
  date: string;
  timezone: string;
  displayName: string | null;
  routine: RoutineDay;
  habits: { items: Habit[]; due: number; completed: number };
  tasks: { items: Task[]; total: number };
  learning: { minutes: number; goalMinutes: number };
  workout: { id: Id; name: string; endedAt: string | null } | null;
  score: ScoreResult | null;
  unreadNotifications: number;
}

export interface DashboardSummary {
  weekly: WeeklyAnalytics;
  finance: {
    month: string;
    currency: string;
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number | null;
    totalBalance: number;
  };
  projects: { id: Id; name: string; progress: number; deadline: string | null; status: ProjectStatus; taskCount: number; completedTaskCount: number }[];
  fitness: { latestWeight: number | null; weightChange: number | null; unit: string; workoutsThisWeek: number };
}
