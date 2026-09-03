import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TAG_COLORS } from "@/hooks/useTags"
import { cn } from "@/lib/utils"

interface TagCreateFormProps {
  /** Prefilled name (e.g. the current search text). */
  initialName?: string
  onCancel: () => void
  /** Create the tag. Resolves when done; the caller stays in the dropdown. */
  onCreate: (name: string, color: string) => Promise<void> | void
}

/**
 * Shared inline "create tag" panel used by every tag dropdown
 * (detail pickers, bulk menu, right-click submenu and list filters).
 * Rendered inside the open dropdown so the user continues there afterwards.
 */
export const TagCreateForm: React.FC<TagCreateFormProps> = ({
  initialName = "",
  onCancel,
  onCreate,
}) => {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(TAG_COLORS[0])
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const trimmed = name.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      await onCreate(trimmed, color)
      setName("")
    } finally {
      setSaving(false)
    }
  }

  return (
    <fieldset
      className="w-64 space-y-3 p-3 border-0 m-0 min-w-0"
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium">New tag</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit()
          if (e.key === "Escape") onCancel()
        }}
        placeholder="Tag name"
        maxLength={50}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex flex-wrap gap-1.5">
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            className={cn(
              "h-5 w-5 rounded-full border",
              color === c ? "ring-2 ring-ring ring-offset-1" : "",
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" disabled={saving || !name.trim()} onClick={submit}>
          Create
        </Button>
      </div>
    </fieldset>
  )
}
