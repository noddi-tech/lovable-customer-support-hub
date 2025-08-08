import * as React from "react"

import { cn } from "@/lib/utils"
import { EmojiAutocompleteInput } from "@/components/ui/emoji-autocomplete-input"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  emojiAutocomplete?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, emojiAutocomplete = true, onChange, onKeyDown, placeholder, disabled, value: propValue, defaultValue, ...props }, ref) => {
    // Support both controlled and uncontrolled usage seamlessly
    const [internalValue, setInternalValue] = React.useState<string>(
      typeof defaultValue === "string" ? defaultValue : (defaultValue != null ? String(defaultValue) : "")
    )

    const isControlled = propValue !== undefined
    const value = isControlled ? (propValue as unknown as string) : internalValue

    const callParentOnChange = (val: string) => {
      // Update local state for uncontrolled usage
      if (!isControlled) setInternalValue(val)
      // Synthesize a minimal ChangeEvent for consumers expecting e.target.value
      if (onChange) {
        const syntheticEvent = { target: { value: val } } as unknown as React.ChangeEvent<HTMLTextAreaElement>
        onChange(syntheticEvent)
      }
    }

    if (emojiAutocomplete) {
      return (
        <EmojiAutocompleteInput
          value={value ?? ""}
          onChange={callParentOnChange}
          onKeyDown={onKeyDown}
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          placeholder={placeholder}
          disabled={disabled}
        />
      )
    }

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        value={propValue}
        defaultValue={defaultValue}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
