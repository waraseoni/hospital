import { cn } from "@/lib/utils/cn";

interface DynamicListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  addLabel?: string;
  emptyMessage?: string;
}

export function DynamicList<T>({
  items,
  renderItem,
  onAdd,
  onRemove,
  addLabel = "Add",
  emptyMessage = "No items",
}: DynamicListProps<T>) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-4">
          <div className="flex-1">{renderItem(item, i)}</div>
          {onRemove && (
            <button
              onClick={() => onRemove(i)}
              className="shrink-0 rounded px-2 text-xs text-destructive hover:bg-destructive/10"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {onAdd && (
        <button onClick={onAdd} className="rounded-lg border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          + {addLabel}
        </button>
      )}
    </div>
  );
}
