"use client";

import { useState } from "react";
import { AuthGate } from "@/components/layout/auth-gate";
import { Header } from "@/components/layout/header";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickAdd } from "@/components/layout/quick-add";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  return (
    <AuthGate>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenMenu={() => setMenuOpen(true)} />
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
            {children}
          </main>
        </div>
      </div>
      <MobileNav onAdd={() => setAddOpen(true)} />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} />
    </AuthGate>
  );
}
