export default function InPlayPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-text-primary">In-Play</h1>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-red/10">
          <span className="w-2 h-2 rounded-full bg-accent-red animate-live-pulse" />
          <span className="text-[11px] font-bold text-accent-red uppercase tracking-wider">
            Live
          </span>
        </span>
      </div>
      <p className="text-[13px] text-text-muted">
        Real-time odds updates for matches currently in progress.
      </p>

      {/* Live matches placeholder */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-bg-card border border-accent-red/20 rounded-xl p-5 hover:border-accent-red/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-accent-red uppercase tracking-wider">
                ● Live — 67&apos;
              </span>
              <span className="text-[11px] text-text-dim">Premier League</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-text-primary">
                    Team A
                  </span>
                  <span className="text-[18px] font-black text-accent-green tabular-nums">
                    2
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[14px] font-semibold text-text-primary">
                    Team B
                  </span>
                  <span className="text-[18px] font-black text-text-secondary tabular-nums">
                    1
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {["1.45", "4.80", "6.50"].map((odd, j) => (
                  <button
                    key={j}
                    className="w-16 py-2.5 rounded-lg bg-bg-input border border-border-subtle text-[14px] font-bold text-text-primary tabular-nums hover:border-accent-green hover:bg-accent-green/5 transition-all"
                  >
                    {odd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
