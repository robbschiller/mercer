import Link from "next/link";
import { NewBidWizard } from "@/components/new-bid-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default async function NewBidPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: errorParam } = await searchParams;
  const errorMessage = errorParam
    ? decodeURIComponent(errorParam)
    : null;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>New bid</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/bids">Back to bids</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <NewBidWizard errorMessage={errorMessage} />
        </CardContent>
      </Card>
    </div>
  );
}
