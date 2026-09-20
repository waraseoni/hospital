import { cn } from "@/lib/utils/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "stat" | "outline";
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function Card({ className, variant = "default", hoverable, clickable, onClick, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        variant === "stat" && "p-3.5 sm:p-4",
        hoverable && "stat-card",
        clickable && "stat-card cursor-pointer",
        className
      )}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
}

export function StatCard({ icon, label, value, trend, className }: StatCardProps) {
  return (
    <Card variant="stat" className={cn("stat-card", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {trend && (
            <p className={`text-[11px] font-medium ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.positive ? "\u2191" : "\u2193"} {trend.value}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
