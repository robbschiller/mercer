"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type LabelMap = Record<string, string>;
type SetLabel = (segment: string, label: string | null) => void;

const LabelsCtx = createContext<LabelMap>({});
const SetLabelCtx = createContext<SetLabel>(() => {});

export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<LabelMap>({});
  const set = useCallback<SetLabel>((segment, label) => {
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
  }, []);
  const labelsValue = useMemo(() => labels, [labels]);
  return (
    <SetLabelCtx.Provider value={set}>
      <LabelsCtx.Provider value={labelsValue}>{children}</LabelsCtx.Provider>
    </SetLabelCtx.Provider>
  );
}

export function useBreadcrumbLabels(): LabelMap {
  return useContext(LabelsCtx);
}

export function BreadcrumbLabel({
  segment,
  label,
}: {
  segment: string;
  label: string;
}) {
  const set = useContext(SetLabelCtx);
  useEffect(() => {
    set(segment, label);
    return () => set(segment, null);
  }, [set, segment, label]);
  return null;
}
