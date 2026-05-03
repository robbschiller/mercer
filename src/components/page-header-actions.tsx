"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PORTAL_ID = "page-header-actions";

/**
 * Portals its children into the slot in the app shell header (right side
 * of the breadcrumb). Pages call this to put per-page action buttons up
 * in the top bar without prop-drilling through the layout.
 */
export function PageHeaderActions({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById(PORTAL_ID));
  }, []);
  return target ? createPortal(children, target) : null;
}

export function PageHeaderActionsSlot({
  className,
}: {
  className?: string;
}) {
  return <div id={PORTAL_ID} className={className} />;
}
