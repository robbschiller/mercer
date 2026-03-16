"use client";

import { useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { computeTotalSqft } from "@/lib/dimensions";

function parseGroupString(str: string): number[] {
  return str
    .split(/[x×*]/)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);
}

function formatGroup(group: number[]): string {
  return group.join(" × ");
}

interface DimensionInputProps {
  value: number[][];
  onChange: (dimensions: number[][]) => void;
}

export function DimensionInput({ value, onChange }: DimensionInputProps) {
  const [inputs, setInputs] = useState<string[]>(() =>
    value.length > 0 ? value.map(formatGroup) : [""]
  );

  const updateDimensions = useCallback(
    (newInputs: string[]) => {
      setInputs(newInputs);
      const parsed = newInputs
        .map(parseGroupString)
        .filter((g) => g.length > 0);
      onChange(parsed);
    },
    [onChange]
  );

  const handleGroupChange = (index: number, val: string) => {
    const next = [...inputs];
    next[index] = val;
    updateDimensions(next);
  };

  const addGroup = () => {
    updateDimensions([...inputs, ""]);
  };

  const removeGroup = (index: number) => {
    if (inputs.length <= 1) return;
    const next = inputs.filter((_, i) => i !== index);
    updateDimensions(next);
  };

  const parsed = inputs.map(parseGroupString).filter((g) => g.length > 0);
  const total = computeTotalSqft(parsed);

  return (
    <div className="flex flex-col gap-2">
      {inputs.map((input, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">+</span>
          )}
          <Input
            value={input}
            onChange={(e) => handleGroupChange(i, e.target.value)}
            placeholder="e.g. 90 x 33"
            className="font-mono text-sm"
          />
          {inputs.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => removeGroup(i)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs h-7 px-2"
          onClick={addGroup}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add group
        </Button>
        {total > 0 && (
          <span className="text-sm font-medium tabular-nums">
            = {total.toLocaleString()} sqft
          </span>
        )}
      </div>
    </div>
  );
}

export function formatDimensions(dimensions: number[][] | null): string {
  if (!dimensions || dimensions.length === 0) return "—";
  return dimensions.map((g) => g.join(" × ")).join(" + ");
}
