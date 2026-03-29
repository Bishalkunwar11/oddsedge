"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BetSlip from "@/components/layout/BetSlip";
import LiveTicker from "@/components/layout/LiveTicker";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [betSlipOpen, setBetSlipOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Full width Top Navigation */}
      <TopBar onToggleBetSlip={() => setBetSlipOpen((prev) => !prev)} />
      
      {/* Real-time Ticker Component beneath TopBar */}
      <LiveTicker />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left sidebar navigation */}
        <Sidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 lg:ml-0 bg-background/50">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>

        {/* Right bet slip sidebar */}
        <BetSlip isOpen={betSlipOpen} onClose={() => setBetSlipOpen(false)} />
      </div>
    </div>
  );
}
