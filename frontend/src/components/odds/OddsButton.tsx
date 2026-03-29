"use client";

import { useEffect, useRef, useState } from "react";

interface OddsButtonProps {
  label: string;
  price: number;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * Clickable odds button that flashes green on price increase and red on
 * price decrease, mimicking live sportsbook behaviour.
 */
export default function OddsButton({
  label,
  price,
  isSelected = false,
  onClick,
}: OddsButtonProps) {
  const prevPrice = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? "up" : "down");
      prevPrice.current = price;

      const timer = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(timer);
    }
  }, [price]);

  // Arrow indicator
  const arrow =
    flash === "up" ? " ▲" : flash === "down" ? " ▼" : "";

  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center
        w-full min-w-[72px] py-2.5 px-2 rounded-lg
        border text-center transition-all duration-200
        ${
          isSelected
            ? "bg-accent-green/15 border-accent-green text-accent-green"
            : "bg-bg-input border-border-subtle text-text-primary hover:border-accent-green/50 hover:bg-accent-green/5"
        }
        ${flash === "up" ? "!border-accent-green !bg-accent-green/10" : ""}
        ${flash === "down" ? "!border-accent-red !bg-accent-red/10" : ""}
      `}
      aria-label={`${label} odds ${price.toFixed(2)}`}
      aria-pressed={isSelected}
    >
      <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider leading-none mb-1">
        {label}
      </span>
      <span
        className={`
          text-[15px] font-bold tabular-nums leading-none
          ${flash === "up" ? "text-accent-green" : ""}
          ${flash === "down" ? "text-accent-red" : ""}
          ${isSelected && !flash ? "text-accent-green" : ""}
        `}
      >
        {price.toFixed(2)}
        {arrow && (
          <span
            className={`text-[10px] ml-0.5 ${
              flash === "up" ? "text-accent-green" : "text-accent-red"
            }`}
          >
            {arrow}
          </span>
        )}
      </span>
      {/* Selection indicator dot */}
      {isSelected && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent-green border-2 border-bg-base" />
      )}
    </button>
  );
}
