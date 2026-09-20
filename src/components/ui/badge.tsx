import { cn } from "@/lib/utils/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "info" | "outline" | "muted";
}

const badgeVariants = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-green-50 text-green-700 ring-1 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/20",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20",
  destructive: "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-400/20",
  info: "bg-sky-50 text-sky-700 ring-1 ring-sky-600/20 dark:bg-sky-900/20 dark:text-sky-400 dark:ring-sky-400/20",
  outline: "border border-input text-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
