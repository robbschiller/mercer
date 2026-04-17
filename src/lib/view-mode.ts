export type ViewMode = "cards" | "table";

export const DEFAULT_VIEW_MODE: ViewMode = "cards";

export function parseViewMode(value: string | undefined | null): ViewMode {
  return value === "table" ? "table" : "cards";
}
