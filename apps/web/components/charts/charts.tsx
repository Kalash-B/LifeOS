"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

// Rows are plain objects; keys are referenced by `xKey` and `series[].key`.
type Datum = object;

export interface Series {
  key: string;
  label: string;
  /** CSS color — use the validated --series-N slots, in order. */
  color: string;
}

const axisProps = {
  tick: { fill: "var(--text-3)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--grid)" },
} as const;

function ChartTooltip({ active, payload, label, format, labelFormat }: TooltipContentProps<number, string> & { format: (v: number) => string; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-text">{labelFormat ? labelFormat(String(label)) : label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="tabular flex items-center gap-2 text-text-2">
          <span className="size-2 rounded-full" style={{ background: entry.color }} aria-hidden />
          {entry.name}: <span className="font-medium text-text">{format(Number(entry.value))}</span>
        </p>
      ))}
    </div>
  );
}

interface BaseProps {
  data: Datum[];
  xKey: string;
  series: Series[];
  format?: (value: number) => string;
  xFormat?: (value: string) => string;
  yDomain?: [number | "auto", number | "auto"];
}

/** Bars: one series → single color (no legend); 2+ series → grouped with a legend. */
export function BarSeriesChart({ data, xKey, series, format = String, xFormat, yDomain }: BaseProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={2} barCategoryGap="28%">
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={8} />
        <YAxis {...axisProps} axisLine={false} width={48} tickFormatter={(v) => format(Number(v))} domain={yDomain} allowDecimals={false} />
        <Tooltip cursor={{ fill: "var(--surface-2)" }} content={(props) => <ChartTooltip {...(props as TooltipContentProps<number, string>)} format={format} labelFormat={xFormat} />} />
        {series.length > 1 && <Legend itemSorter={null} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />}
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LineSeriesChart({ data, xKey, series, format = String, xFormat, yDomain = ["auto", "auto"] }: BaseProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey={xKey} {...axisProps} tickFormatter={xFormat} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} axisLine={false} width={48} tickFormatter={(v) => format(Number(v))} domain={yDomain} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          content={(props) => <ChartTooltip {...(props as TooltipContentProps<number, string>)} format={format} labelFormat={xFormat} />}
        />
        {series.length > 1 && <Legend itemSorter={null} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 3, fill: s.color, stroke: "var(--surface)", strokeWidth: 2 } : false}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Horizontal ranked bars in plain HTML — for category breakdowns. Single hue, values labelled. */
export function RankedBars({ items, format, max }: { items: { label: string; value: number }[]; format: (v: number) => string; max?: number }): ReactNode {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label} className="grid gap-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate text-text-2">{item.label}</span>
            <span className="tabular font-medium text-text">{format(item.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-series-1" style={{ width: `${(item.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
