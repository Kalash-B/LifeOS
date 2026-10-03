"use client";

import { Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";

interface ChartFrameProps {
  /** Accessible summary of what the chart shows. */
  summary: string;
  columns: string[];
  rows: (string | number)[][];
  children: ReactNode;
  height?: number;
}

/** Wraps a chart with a toggleable data table so values are never conveyed by the graphic alone. */
export function ChartFrame({ summary, columns, rows, children, height = 220 }: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="m-0">
      {showTable ? (
        <div className="max-h-[260px] overflow-auto rounded-lg border border-border">
          <table className="tabular w-full text-left text-sm">
            <caption className="sr-only">{summary}</caption>
            <thead className="sticky top-0 bg-surface-2 text-text-2">
              <tr>
                {columns.map((column) => (
                  <th key={column} scope="col" className="px-3 py-2 font-medium">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-1.5 text-text">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div role="img" aria-label={summary} style={{ height }}>
          {children}
        </div>
      )}
      <figcaption className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-text-3 hover:bg-surface-2 hover:text-text"
          aria-pressed={showTable}
        >
          <Table2 className="size-3.5" aria-hidden />
          {showTable ? "Show chart" : "Show table"}
        </button>
      </figcaption>
    </figure>
  );
}
