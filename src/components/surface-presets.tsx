"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const PRESETS = [
  "Front",
  "Back",
  "Side A",
  "Side B",
  "Posts",
  "Porch Ceilings",
  "Porch Walls",
  "Porch Side Bands",
  "Porch Floors",
  "Porch Steps",
  "Above Soffit",
  "Catwalks",
  "Catwalk Ceilings",
  "Stairwells",
  "Stairwell Walls",
  "Railings",
  "Landing Rails",
  "Tunnel Walls",
  "Tunnel Ceiling",
  "Elevator Area",
  "Divider Fence",
  "Parking Covers",
] as const;

export function SurfacePresets({
  onSelect,
}: {
  onSelect: (name: string) => void;
}) {
  return (
    <Select
      onValueChange={(val) => {
        onSelect(val);
      }}
    >
      <SelectTrigger className="h-8 text-xs w-auto gap-1">
        <SelectValue placeholder="Presets" />
      </SelectTrigger>
      <SelectContent>
        {PRESETS.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
