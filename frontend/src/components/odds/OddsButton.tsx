"use client";

import { useEffect, useRef, useState } from "react";

interface OddsButtonProps {
  label?: string;
  price: number;
  isSelected?: boolean;
  isSuspended?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Clickable odds button that flashes green on price increase and red on
 * price decrease, mimicking live sportsbook behaviour. Includes "Suspended"
 * market state locking.
 */
export default function OddsButton({
  label,
  price,
  isSelected = false,
  isSuspended = false,
  onClick,
  className = "",
}: OddsButtonProps) {
  const prevPrice = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (isSuspended) {
      setFlash(null);
      return;
    }

    if (price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? "up" : "down");
      prevPrice.current = price;

      const timer = setTimeout(() => setFlash(null), 600);
      return () => clearTimeout(timer);
    }
  }, [price, isSuspended]);

  // Arrow indicator
  const arrow = flash === "up" ? "▲" : flash === "down" ? "▼" : "";

  return (
    <button
      onClick={isSuspended ? undefined : onClick}
      disabled={isSuspended}
      className={`
        group relative flex flex-row items-center justify-between
        w-full min-h-[44px] min-w-[72px] py-2 px-3 rounded-lg overflow-hidden
        border transition-all duration-200
        ${
          isSuspended
            ? "opacity-50 bg-secondary/30 border-border cursor-not-allowed pointer-events-none grayscale"
            : `hover:scale-[1.02] active:scale-[0.98] ${
                isSelected
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : "bg-input border-border text-foreground hover:border-primary/50 hover:bg-primary/5"
              }`
        }
        ${!isSuspended && flash === "up" ? "!border-chart-2 !bg-chart-2/15 !text-chart-2" : ""}
        ${!isSuspended && flash === "down" ? "!border-destructive !bg-destructive/15 !text-destructive" : ""}
        ${className}
      `}
      aria-label={`${label ? label + " " : ""}odds ${price.toFixed(2)}${isSuspended ? " suspended" : ""}`}
      aria-pressed={isSelected}
      aria-disabled={isSuspended}
    >
      {/* Label (Spread/Total Text) */}
      {label && (
        <span
          className={`text-[12px] font-semibold tracking-wide ${
            isSelected ? "text-primary-foreground/90" : "text-muted-foreground"
          }`}
        >
          {label}
        </span>
      )}
      
      {/* Spacer between label and price if label exists */}
      {label && <span className="flex-1" />}

      {/* Main Odds Value & Arrows */}
      <span
        className={`
          flex items-center text-[14px] font-bold tabular-nums font-mono leading-none
          ${
            isSuspended 
              ? "text-muted-foreground"
              : !isSelected && flash === "up"
              ? "text-chart-2"
              : !isSelected && flash === "down"
              ? "text-destructive"
              : ""
          }
        `}
      >
        {isSuspended && (
          <span className="mr-1.5 text-[11px] select-none opacity-80 flex items-center justify-center">
            🔒
          </span>
        )}
        {price > 0 && price.toString().indexOf('.') === -1 && price > 100 ? `+${price}` : price.toFixed(2)}
        {arrow && !isSuspended && (
          <span
            className={`text-[9px] ml-1 ${
              isSelected
                ? "text-primary-foreground/80"
                : flash === "up"
                ? "text-chart-2"
                : "text-destructive"
            }`}
          >
            {arrow}
          </span>
        )}
      </span>

      {/* Cross-hatch overly overlay if suspended for extra texture */}
      {isSuspended && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.03]" 
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 1px, transparent 4px)" }}
        />
      )}
    </button>
  );
}
