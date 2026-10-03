import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg" aria-label="LifeOS home">
      <Image src="/logo-mark.png" alt="" width={32} height={32} priority className="size-8" />
      <span className="text-[15px] font-semibold tracking-tight text-text">LifeOS</span>
    </Link>
  );
}

/** Full brand lockup on its own light tile, so it reads the same in light and dark themes. */
export function BrandLogo({ size = 160, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-border ${className}`} style={{ width: size, height: size }}>
      <Image src="/logo.png" alt="LifeOS — Plan · Track · Grow · Live better" width={size} height={size} priority className="size-full object-contain" />
    </div>
  );
}
