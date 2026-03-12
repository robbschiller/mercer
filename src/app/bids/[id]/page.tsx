import { notFound } from "next/navigation";
import { getBid } from "@/lib/store";
import { updateBidAction, deleteBidAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function BidPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bid = await getBid(id);

  if (!bid) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a href="/bids">&larr; Bids</a>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{bid.clientName}</CardTitle>
              <CardDescription>{bid.address}</CardDescription>
            </div>
            <Badge variant="secondary">{bid.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateBidAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={bid.id} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Property address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={bid.address}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clientName">Client / property manager</Label>
              <Input
                id="clientName"
                name="clientName"
                defaultValue={bid.clientName}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={bid.notes}
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={bid.status}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buildings</CardTitle>
          <CardDescription>
            Add building types with counts and measurements to calculate your
            bid.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No buildings added yet.
            </p>
            <Button variant="outline" disabled>
              Add building (coming soon)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm font-medium">Delete bid</p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <form action={deleteBidAction}>
            <input type="hidden" name="id" value={bid.id} />
            <Button variant="destructive" size="sm" type="submit">
              Delete
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
