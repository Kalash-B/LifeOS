import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 flex justify-center rounded-3xl" aria-label="LifeOS home">
          <BrandLogo size={132} />
        </Link>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-text-3">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-text-3">{footer}</p>
      </div>
    </div>
  );
}
