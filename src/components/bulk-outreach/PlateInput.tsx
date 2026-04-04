import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";

interface PlateInputProps {
  onLookup: (plates: string[]) => void;
  isLoading: boolean;
}

export function PlateInput({ onLookup, isLoading }: PlateInputProps) {
  const [text, setText] = useState("");

  const handleLookup = () => {
    const plates = text
      .split(/[,\n\r;]+/)
      .map((p) => p.trim().replace(/[\s-]/g, "").toUpperCase())
      .filter((p) => p.length >= 2);

    if (plates.length > 0) {
      onLookup([...new Set(plates)]);
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="plates">Registration Numbers</Label>
      <Textarea
        id="plates"
        placeholder={"AB12345\nCD67890\nEF11223\n\nSeparate with commas, semicolons, or new lines"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-mono"
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {text.split(/[,\n\r;]+/).filter((p) => p.trim()).length} plate(s) entered
        </p>
        <Button onClick={handleLookup} disabled={isLoading || !text.trim()}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Look Up Customers
        </Button>
      </div>
    </div>
  );
}
