import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  label: string;
  className?: string;
  tone?: "accent" | "success" | "series";
}

export function Progress({ value, label, className, tone = "accent" }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          tone === "accent" && "bg-accent",
          tone === "success" && "bg-success",
          tone === "series" && "bg-series-1",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface RingProps {
  value: number | null;
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
}

export function ProgressRing({ value, size = 120, stroke = 10, label, children }: RingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${value === null ? "no data" : `${Math.round(clamped)}%`}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
