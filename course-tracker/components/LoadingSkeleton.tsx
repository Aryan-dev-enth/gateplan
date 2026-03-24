"use client";

interface LoadingSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoadingSkeleton({ className = "", children }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="glass p-6 rounded-lg">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded" style={{ background: "var(--muted)" }}></div>
          <div className="h-8 bg-gray-200 rounded w-3/4" style={{ background: "var(--muted)" }}></div>
          <div className="h-3 bg-gray-200 rounded w-1/2" style={{ background: "var(--muted)" }}></div>
        </div>
      </div>
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="glass p-6 text-center relative overflow-hidden">
      <div className="shimmer absolute inset-0 rounded-lg pointer-events-none" />
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded mx-auto w-20" style={{ background: "var(--muted)" }}></div>
        <div className="h-10 bg-gray-200 rounded mx-auto w-16" style={{ background: "var(--muted)" }}></div>
        <div className="h-3 bg-gray-200 rounded mx-auto w-24" style={{ background: "var(--muted)" }}></div>
        <div className="h-2 bg-gray-200 rounded w-full" style={{ background: "var(--muted)" }}></div>
      </div>
    </div>
  );
}

export function SubjectCardSkeleton() {
  return (
    <div className="glass p-4 rounded-lg relative overflow-hidden">
      <div className="shimmer absolute inset-0 rounded-lg pointer-events-none" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-24" style={{ background: "var(--muted)" }}></div>
          <div className="h-6 bg-gray-200 rounded w-12" style={{ background: "var(--muted)" }}></div>
        </div>
        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded px-2 py-1 w-16" style={{ background: "var(--muted)" }}></div>
          <div className="h-5 bg-gray-200 rounded px-2 py-1 w-20" style={{ background: "var(--muted)" }}></div>
          <div className="h-5 bg-gray-200 rounded px-2 py-1 w-16" style={{ background: "var(--muted)" }}></div>
        </div>
        <div className="h-2 bg-gray-200 rounded w-full" style={{ background: "var(--muted)" }}></div>
      </div>
    </div>
  );
}

export function BacklogSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-gray-200 rounded w-32" style={{ background: "var(--muted)" }}></div>
        <div className="h-4 bg-gray-200 rounded w-20" style={{ background: "var(--muted)" }}></div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass p-3 rounded-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-gray-200 rounded w-28" style={{ background: "var(--muted)" }}></div>
              <div className="h-5 bg-gray-200 rounded w-12" style={{ background: "var(--muted)" }}></div>
            </div>
            <div className="flex gap-2">
              <div className="h-3 bg-gray-200 rounded w-16" style={{ background: "var(--muted)" }}></div>
              <div className="h-3 bg-gray-200 rounded w-14" style={{ background: "var(--muted)" }}></div>
              <div className="h-3 bg-gray-200 rounded w-12" style={{ background: "var(--muted)" }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="glow-orb w-96 h-96 -top-32 -right-32" style={{ background: "rgba(99,120,255,0.08)" }} />
      <div className="glow-orb w-64 h-64 bottom-0 -left-32" style={{ background: "rgba(34,211,165,0.05)" }} />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-24" style={{ background: "var(--muted)" }}></div>
            <div className="h-4 bg-gray-200 rounded w-32" style={{ background: "var(--muted)" }}></div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20 px-4" style={{ background: "var(--muted)" }}></div>
            <div className="h-8 bg-gray-200 rounded w-16 px-4" style={{ background: "var(--muted)" }}></div>
            <div className="h-8 bg-gray-200 rounded w-16 px-4" style={{ background: "var(--muted)" }}></div>
          </div>
        </div>

        {/* Metrics Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>

        {/* Backlog Section Skeleton */}
        <div className="mb-8">
          <BacklogSkeleton />
        </div>

        {/* Subjects Section Skeleton */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-5 bg-gray-200 rounded w-20" style={{ background: "var(--muted)" }}></div>
            <div className="h-4 bg-gray-200 rounded w-16" style={{ background: "var(--muted)" }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
