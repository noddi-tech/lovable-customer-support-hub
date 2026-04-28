import { fieldLabel } from './fieldLabels';
import { formatValue, type FormatContext } from './valueFormatters';

interface Props {
  oldValues: Record<string, unknown> | null | undefined;
  newValues: Record<string, unknown> | null | undefined;
  ctx?: FormatContext;
}

export function DiffRenderer({ oldValues, newValues, ctx }: Props) {
  const allKeys = new Set<string>([
    ...(oldValues ? Object.keys(oldValues) : []),
    ...(newValues ? Object.keys(newValues) : []),
  ]);

  if (allKeys.size === 0) {
    return <p className="text-sm text-muted-foreground">Ingen endringer.</p>;
  }

  return (
    <div className="space-y-2">
      {Array.from(allKeys).map((key) => {
        const oldVal = oldValues?.[key];
        const newVal = newValues?.[key];
        const oldStr = formatValue(key, oldVal, ctx);
        const newStr = formatValue(key, newVal, ctx);
        const isLong =
          oldStr.length > 40 ||
          newStr.length > 40 ||
          (Array.isArray(oldVal) && oldVal.length > 3) ||
          (Array.isArray(newVal) && newVal.length > 3) ||
          (oldVal !== null && typeof oldVal === 'object' && !Array.isArray(oldVal)) ||
          (newVal !== null && typeof newVal === 'object' && !Array.isArray(newVal));

        return (
          <div key={key} className="text-sm">
            {isLong ? (
              <div>
                <div className="font-medium mb-1">{fieldLabel(key)}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-destructive/5 border border-destructive/20 rounded p-2">
                    <div className="text-xs text-muted-foreground mb-1">Før</div>
                    <div className="font-mono text-xs whitespace-pre-wrap break-words">
                      {oldStr}
                    </div>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
                    <div className="text-xs text-muted-foreground mb-1">Etter</div>
                    <div className="font-mono text-xs whitespace-pre-wrap break-words">
                      {newStr}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-medium">{fieldLabel(key)}:</span>
                <span className="text-muted-foreground line-through">{oldStr}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-foreground font-medium">{newStr}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
