import { ArrowRight, BarChart3, Bell, CalendarCheck, Dumbbell, FolderKanban, GraduationCap, Repeat, Wallet } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BrandLogo, Logo } from "@/components/layout/logo";

const MODULES = [
  { icon: CalendarCheck, title: "Daily routine", text: "Time-blocked routines with recurrence. Check items off and see how your days actually go." },
  { icon: Repeat, title: "Habits", text: "Daily, weekday or weekly habits with schedule-aware streaks — weekends never break a weekday streak." },
  { icon: Dumbbell, title: "Fitness", text: "Weight trend, workouts with sets and reps, training volume and personal records." },
  { icon: GraduationCap, title: "Learning", text: "Goals, topics and timed study sessions with a daily study target." },
  { icon: FolderKanban, title: "Projects", text: "Projects, tasks and milestones. Progress follows completed tasks unless you set it yourself." },
  { icon: Wallet, title: "Finance", text: "Accounts, income, expenses, savings goals and investments — with monthly reports." },
  { icon: Bell, title: "Reminders", text: "Habit reminders, due dates and daily or weekly reviews — with quiet hours you control." },
  { icon: BarChart3, title: "Analytics", text: "Daily, weekly and monthly insights across every module, from your own data." },
];

const LOOP = ["Plan", "Execute", "Track", "Analyze", "Reflect", "Improve"];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo href="/" />
        <nav className="flex items-center gap-2" aria-label="Account">
          <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
            Log in
          </Link>
          <Link href="/register" className={buttonVariants()}>
            Get started
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_auto]">
        <div>
        <p className="text-sm font-medium text-accent">Personal life operating system</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-text sm:text-5xl">
          One calm place for your day, habits, health, learning, projects and money.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-text-2">
          LifeOS connects the parts of your life that usually live in eight different apps — so you can see what you actually did, and decide what to do next.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Create your LifeOS <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            I already have an account
          </Link>
        </div>
        <ol className="mt-12 flex flex-wrap items-center gap-2 text-sm text-text-2" aria-label="The LifeOS loop">
          {LOOP.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-surface px-3 py-1">{step}</span>
              {i < LOOP.length - 1 && <ArrowRight className="size-3.5 text-text-3" aria-hidden />}
            </li>
          ))}
        </ol>
        </div>
        <BrandLogo size={340} className="mx-auto hidden sm:block" />
      </section>

      <section className="border-t border-border bg-surface/60" aria-labelledby="features">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="features" className="text-2xl font-semibold tracking-tight">
            Everything connected, nothing duplicated
          </h2>
          <p className="mt-2 max-w-2xl text-text-2">Every module writes to one system of record, so your dashboard and analytics explain progress instead of just showing numbers.</p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-border bg-surface p-5">
                <Icon className="size-5 text-accent" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-text-2">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 rounded-2xl border border-border bg-surface p-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">Your data stays yours</h2>
            <p className="mt-2 max-w-2xl text-sm text-text-2">
              No bank logins, no ads, no selling data. Export everything as JSON at any time, and delete your account in one step. The LifeOS score is a transparent visualization you can reweight or switch off — never a judgement of you.
            </p>
          </div>
          <Link href="/register" className={buttonVariants()}>
            Start free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-text-3">LifeOS · Plan → Execute → Track → Analyze → Reflect → Improve</footer>
    </div>
  );
}
