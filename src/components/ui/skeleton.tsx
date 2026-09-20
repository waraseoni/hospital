import { cn } from "@/lib/utils/cn";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  className?: string;
}

export function Skeleton({ className, lines = 1, ...props }: SkeletonProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-md bg-muted", i === lines - 1 ? "w-3/4 h-3" : "w-full h-3.5")}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-3 flex-1 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex gap-3">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-5 w-1/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
