"use client"

import type { ScrollEvent } from "../core/data-table-structure"

type ScrollHandlerOptions = {
  onScroll?: (event: ScrollEvent) => void
  onScrolledTop?: () => void
  onScrolledBottom?: () => void
  scrollThreshold: number
}

export function createScrollHandler({
  onScroll,
  onScrolledTop,
  onScrolledBottom,
  scrollThreshold,
}: ScrollHandlerOptions) {
  return (event: Event) => {
    const target = event.currentTarget as HTMLElement
    const { scrollTop, scrollHeight, clientHeight } = target
    const remaining = scrollHeight - scrollTop - clientHeight
    const isTop = scrollTop <= scrollThreshold
    const isBottom = remaining <= scrollThreshold
    const scrollable = Math.max(scrollHeight - clientHeight, 0)
    const percentage = scrollable === 0 ? 100 : (scrollTop / scrollable) * 100

    onScroll?.({
      scrollTop,
      scrollHeight,
      clientHeight,
      isTop,
      isBottom,
      percentage,
    })
    if (isTop) onScrolledTop?.()
    if (isBottom) onScrolledBottom?.()
  }
}
