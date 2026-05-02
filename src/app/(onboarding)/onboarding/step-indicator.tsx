type Step = "website" | "confirm" | "theme";

const STEPS: { id: Step; label: string }[] = [
  { id: "website", label: "Website" },
  { id: "confirm", label: "Company" },
  { id: "theme", label: "Theme" },
];

export function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs uppercase tracking-wider text-[var(--color-ink)]/60 dark:text-white/50">
      {STEPS.map((step, i) => {
        const state =
          i < currentIndex ? "done" : i === currentIndex ? "active" : "todo";
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-current={state === "active" ? "step" : undefined}
              className={
                state === "active"
                  ? "rounded-full bg-[var(--color-amber)]/20 px-2 py-0.5 font-medium text-[var(--color-ink)] dark:text-white"
                  : state === "done"
                    ? "rounded-full bg-[var(--color-ink)]/10 px-2 py-0.5 dark:bg-white/10"
                    : "px-2 py-0.5"
              }
            >
              {i + 1}. {step.label}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden>·</span>}
          </li>
        );
      })}
    </ol>
  );
}
