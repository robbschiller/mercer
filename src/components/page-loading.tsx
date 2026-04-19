import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function BidsListSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BidDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
      <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="h-5 w-2/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="border-destructive/30">
        <CardContent className="pt-6 flex justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="h-5 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full max-w-lg animate-pulse rounded bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <Card className="w-full border-[var(--color-parchment-border)] bg-[var(--color-parchment-soft)]/85 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <CardHeader className="gap-2">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}

export function NewBidPageSkeleton() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between gap-2">
            <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function GenericPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-10 w-2/3 mx-auto animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 mx-auto animate-pulse rounded bg-muted" />
        <div className="h-11 w-40 mx-auto animate-pulse rounded-md bg-muted mt-8" />
      </div>
    </div>
  );
}

export function OsmFootprintsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-5 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        <div className="h-32 w-full animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}
