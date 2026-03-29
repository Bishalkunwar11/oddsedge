export default function ValueBetsPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Value Bets</h1>
        <p className="text-[13px] text-text-muted mt-1">
          Bets where the bookmaker&apos;s odds exceed the consensus fair
          probability — your edge over the market.
        </p>
      </div>

      {/* Threshold control */}
      <div className="flex items-center gap-4 bg-bg-card border border-border-subtle rounded-xl p-4">
        <label className="text-[12px] font-semibold text-text-muted whitespace-nowrap">
          Min Edge
        </label>
        <input
          type="range"
          min={1}
          max={20}
          defaultValue={5}
          className="flex-1 accent-accent-green"
        />
        <span className="text-[14px] font-bold text-accent-green tabular-nums w-12 text-right">
          5.0%
        </span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Value Bets Found", value: "—", accent: "text-accent-green" },
          { label: "Avg Edge", value: "—", accent: "text-accent-green" },
          { label: "Best Edge", value: "—", accent: "text-accent-amber" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-bg-card border border-border-subtle rounded-xl p-4"
          >
            <p className="text-[11px] font-semibold text-text-dim uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-black mt-1 tabular-nums ${stat.accent}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Value bets list placeholder */}
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-text-secondary">
            Detected Value Bets
          </h2>
          <span className="text-[11px] text-text-dim">
            Sorted by edge ↓
          </span>
        </div>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-bg-input flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-7 h-7 text-text-dim"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-text-secondary">
            Scanning for value…
          </p>
          <p className="text-[12px] text-text-dim mt-1">
            Connect to the API to start finding edges against the sharp
            consensus line.
          </p>
        </div>
      </div>
    </div>
  );
}
