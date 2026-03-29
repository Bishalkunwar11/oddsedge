"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BetSlip from "@/components/layout/BetSlip";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [betSlipOpen, setBetSlipOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left sidebar navigation */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onToggleBetSlip={() => setBetSlipOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">{children}</main>
      </div>

      {/* Right bet slip sidebar */}
      <BetSlip isOpen={betSlipOpen} onClose={() => setBetSlipOpen(false)} />
    </div>
  );
}
