"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "leads:detail-width";
const MIN_WIDTH = 320;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 380;

export function LeadDetailAside({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [mounted, setMounted] = useState(false);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (Number.isFinite(parsed)) {
        setWidth(clamp(parsed));
      }
    }
    setMounted(true);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      startXRef.current = event.clientX;
      startWidthRef.current = width;
      (event.target as Element).setPointerCapture(event.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const delta = startXRef.current - event.clientX;
      setWidth(clamp(startWidthRef.current + delta));
    },
    [],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      (event.target as Element).releasePointerCapture(event.pointerId);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.localStorage.setItem(STORAGE_KEY, String(width));
    },
    [width],
  );

  return (
    <aside
      style={
        {
          "--detail-panel-width": `${mounted ? width : DEFAULT_WIDTH}px`,
        } as CSSProperties
      }
      className="fixed right-0 top-14 z-40 h-[calc(100svh-3.5rem)] w-[min(calc(100vw-1rem),24rem)] shrink-0 overflow-y-auto border-l bg-background shadow-xl xl:sticky xl:top-0 xl:z-auto xl:w-(--detail-panel-width) xl:self-start xl:shadow-none"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize details panel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="group absolute left-0 top-0 z-10 hidden h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center xl:flex"
      >
        <span className="h-full w-px bg-transparent transition-colors group-hover:bg-border" />
      </div>
      <div className="p-4 lg:p-5">{children}</div>
    </aside>
  );
}

function clamp(value: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}
