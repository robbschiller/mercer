import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BidNotFound() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-24">
      <h2 className="text-2xl font-bold">Bid not found</h2>
      <p className="text-muted-foreground">
        This bid doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Button asChild>
        <Link href="/bids">Back to bids</Link>
      </Button>
    </div>
  );
}
