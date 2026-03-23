export default function PageLoader() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 animate-pulse">
        {/* Nav skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-7 w-28 rounded-xl mb-2" style={{ background: "var(--tint-accent)" }} />
            <div className="h-4 w-20 rounded-lg" style={{ background: "var(--tint-accent)" }} />
          </div>
          <div className="flex gap-2">
            {[80, 64, 40, 40].map((w, i) => (
              <div key={i} className="h-8 rounded-xl" style={{ width: w, background: "var(--tint-accent)" }} />
            ))}
          </div>
        </div>

        {/* Main card skeleton */}
        <div className="glass p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="h-5 w-40 rounded-lg mb-2" style={{ background: "var(--tint-accent)" }} />
              <div className="h-3 w-56 rounded-lg" style={{ background: "var(--tint-accent)" }} />
            </div>
            <div className="h-9 w-12 rounded-xl" style={{ background: "var(--tint-accent)" }} />
          </div>
          <div className="h-2 w-full rounded-full" style={{ background: "var(--tint-accent)" }} />
        </div>

        {/* Two-col skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <div key={i} className="glass p-5 h-48" style={{ background: "var(--glass-bg)" }}>
              <div className="h-3 w-32 rounded mb-3" style={{ background: "var(--tint-accent)" }} />
              <div className="h-8 w-40 rounded-xl mb-2" style={{ background: "var(--tint-accent)" }} />
              <div className="h-3 w-24 rounded" style={{ background: "var(--tint-accent)" }} />
            </div>
          ))}
        </div>

        {/* List skeleton */}
        <div className="flex flex-col gap-2">
          {[1, 0.85, 0.7, 0.9, 0.6].map((opacity, i) => (
            <div key={i} className="glass p-4" style={{ opacity }}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl flex-shrink-0" style={{ background: "var(--tint-accent)" }} />
                <div className="flex-1">
                  <div className="h-4 w-48 rounded mb-2" style={{ background: "var(--tint-accent)" }} />
                  <div className="h-2 w-full rounded-full" style={{ background: "var(--tint-accent)" }} />
                </div>
                <div className="h-5 w-10 rounded" style={{ background: "var(--tint-accent)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
