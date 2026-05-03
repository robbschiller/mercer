"use client"

import type { Table } from "@tanstack/react-table"

export function resolveRowFromClick<TData>(
  target: HTMLElement,
  table: Table<TData>,
) {
  if (target.closest("a, button, input, select, textarea, label")) return null
  const rowElement = target.closest("tr[data-row-id]")
  const rowId = rowElement?.getAttribute("data-row-id")
  if (!rowId) return null
  return table.getRowModel().rowsById[rowId] ?? null
}
