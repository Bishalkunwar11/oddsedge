export default function ArbitragePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Arbitrage Scanner
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Risk-free opportunities where combined implied probabilities fall
          below 100%.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Opportunities", value: "—", accent: "text-chart-2" },
          { label: "Best Arb %", value: "—", accent: "text-chart-2" },
          { label: "Markets Scanned", value: "—", accent: "text-foreground" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4"
          >
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {stat.label}
            </p>
            <p className={`text-2xl font-black mt-1 tabular-nums font-mono ${stat.accent}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Arb table placeholder */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-[13px] font-semibold text-muted-foreground">
            Active Opportunities
          </h2>
        </div>
        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-input flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-7 h-7 text-muted-foreground/70"
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
          <p className="text-[13px] font-semibold text-muted-foreground">
            Scanning for arbitrage…
          </p>
          <p className="text-[12px] text-muted-foreground/70 mt-1">
            Connect to the API to start detecting opportunities in real time.
          </p>
        </div>
      </div>
    </div>
  );
}
