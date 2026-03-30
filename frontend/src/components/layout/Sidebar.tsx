"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/matches",
    label: "Matches",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/in-play",
    label: "In-Play",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    live: true,
  },
  {
    href: "/arbitrage",
    label: "Arbitrage",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: "/value-bets",
    label: "Value Bets",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-[240px] sticky top-0 h-screen overflow-y-auto bg-sidebar border-r border-border shrink-0 z-20 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.3)]">
      {/* Brand area */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50">
        <picture>
          <img src="/logo.png" alt="OddsEdge Logo" className="w-7 h-7 object-contain drop-shadow" />
        </picture>
        <span className="text-foreground font-black text-[16px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#2B6CB5]">
          OddsEdge
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-2 relative">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link key={item.href} href={item.href} className="block outline-none">
              <motion.div
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3 text-[13px] font-semibold rounded-lg overflow-hidden transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                {/* Antigravity active state pill background sliding via layoutId */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-primary/10 rounded-lg shadow-[inset_0_0_12px_rgba(30,58,138,0.2)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
                
                {/* Active Route glowing left-border */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-border"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(30,58,138,1)] rounded-r-md"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}

                <span
                  className={cn(
                    "z-10 transition-transform duration-300",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )}
                >
                  {item.icon}
                </span>

                <span className="z-10 relative drop-shadow-sm">{item.label}</span>

                {item.live && (
                  <span className="ml-auto flex items-center gap-1.5 z-10 bg-destructive/10 px-2 py-0.5 rounded-full border border-destructive/20 shadow-sm backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    <span className="text-[9px] font-black text-destructive uppercase tracking-wider">
                      Live
                    </span>
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-5 border-t border-border/50 mt-auto bg-gradient-to-t from-background/50 to-transparent">
        <div className="text-[11px] font-semibold text-muted-foreground/60 transition-colors hover:text-muted-foreground cursor-default drop-shadow-sm">
          © 2026 OddsEdge
        </div>
      </div>
    </aside>
  );
}
