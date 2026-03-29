export default function ArbitragePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Arbitrage Scanner
        </h1>
        <p className="text-[13px] text-text-muted mt-1">
          Risk-free opportunities where combined implied probabilities fall
          below 100%.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Opportunities", value: "—", accent: "text-accent-green" },
          { label: "Best Arb %", value: "—", accent: "text-accent-green" },
          { label: "Markets Scanned", value: "—", accent: "text-text-primary" },
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

      {/* Arb table placeholder */}
      <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="text-[13px] font-semibold text-text-secondary">
            Active Opportunities
          </h2>
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-text-secondary">
            Scanning for arbitrage…
          </p>
          <p className="text-[12px] text-text-dim mt-1">
            Connect to the API to start detecting opportunities in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
