"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type LabelMap = Record<string, string>;
type Ctx = {
  labels: LabelMap;
  set: (segment: string, label: string | null) => void;
};

const BreadcrumbCtx = createContext<Ctx | null>(null);

export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({});
  const set = (segment: string, label: string | null) => {
    setLabels((prev) => {
      if (label === null) {
        if (!(segment in prev)) return prev;
        const next = { ...prev };
        delete next[segment];
        return next;
      }
      if (prev[segment] === label) return prev;
      return { ...prev, [segment]: label };
    });
  };
  return (
    <BreadcrumbCtx.Provider value={{ labels, set }}>
      {children}
    </BreadcrumbCtx.Provider>
  );
}

export function useBreadcrumbLabels(): LabelMap {
  return useContext(BreadcrumbCtx)?.labels ?? {};
}

export function BreadcrumbLabel({
  segment,
  label,
}: {
  segment: string;
  label: string;
}) {
  const ctx = useContext(BreadcrumbCtx);
  useEffect(() => {
    if (!ctx) return;
    ctx.set(segment, label);
    return () => ctx.set(segment, null);
  }, [ctx, segment, label]);
  return null;
}
