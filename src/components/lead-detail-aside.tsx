"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "leads:detail-width";
const MIN_WIDTH = 320;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 360;

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
      style={{ width: mounted ? width : DEFAULT_WIDTH }}
      className="sticky top-0 h-screen shrink-0 self-start overflow-y-auto border-l bg-background"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize details panel"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="group absolute left-0 top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center"
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
