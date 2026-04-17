"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BidsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-24">
      <h2 className="text-2xl font-bold">Failed to load bids</h2>
      <p className="text-muted-foreground">
        Something went wrong loading your bids.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
