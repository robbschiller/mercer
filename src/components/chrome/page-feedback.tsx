/**
 * Inline page-level feedback. Pages that redirect back with `?error=` or
 * `?notice=` render one of these above the content, never a toast.
 */
export function PageError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

export function PageNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-success/30 bg-success-soft px-4 py-2 text-sm text-success-foreground"
    >
      {children}
    </div>
  );
}
