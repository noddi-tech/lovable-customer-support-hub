import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

export function StarRatingInput({
  value,
  onChange,
  max = 5,
  size = "md",
  disabled = false,
  className,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const displayValue = hoverValue ?? value;

  const getStarColor = (starIndex: number) => {
    if (starIndex <= displayValue) {
      if (displayValue >= 4.5) return "text-green-500 fill-green-500";
      if (displayValue >= 3.5) return "text-yellow-500 fill-yellow-500";
      return "text-red-500 fill-red-500";
    }
    return "text-muted-foreground/30";
  };

  return (
    <div 
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((starIndex) => (
        <button
          key={starIndex}
          type="button"
          disabled={disabled}
          className={cn(
            "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 rounded",
            disabled ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
          onMouseEnter={() => !disabled && setHoverValue(starIndex)}
          onClick={() => !disabled && onChange(starIndex)}
        >
          <Star className={cn(sizeClasses[size], getStarColor(starIndex))} />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}
