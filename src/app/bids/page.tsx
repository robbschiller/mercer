import Link from "next/link";
import { getBids } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statusColor: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  sent: "outline",
  won: "default",
  lost: "secondary",
};

export default async function BidsPage() {
  const bids = await getBids();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bids</h1>
        <Button asChild>
          <Link href="/bids/new">New bid</Link>
        </Button>
      </div>

      {bids.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <p className="text-muted-foreground">No bids yet.</p>
            <Button asChild>
              <Link href="/bids/new">Create your first bid</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bids.map((bid) => (
            <Link key={bid.id} href={`/bids/${bid.id}`}>
              <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {bid.propertyName}
                    </CardTitle>
                    <Badge variant={statusColor[bid.status] ?? "secondary"}>
                      {bid.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {bid.clientName} &middot; {bid.address}
                  </CardDescription>
                </CardHeader>
                {bid.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {bid.notes}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
