import { cn } from "@/lib/utils";

/**
 * Outer frame for every product page. Wide (1240) for tables and
 * dashboards, narrow (860) for forms and intake front doors.
 */
export function PageContainer({
  width = "wide",
  className,
  children,
}: {
  width?: "wide" | "narrow";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full px-6 pb-24 pt-7",
        width === "wide" ? "max-w-[1240px]" : "max-w-[860px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
