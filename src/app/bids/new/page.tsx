import Link from "next/link";
import { createBidAction } from "@/lib/actions";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";

export default function NewBidPage() {
  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>New bid</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBidAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="propertyName">Property name</Label>
              <Input
                id="propertyName"
                name="propertyName"
                placeholder="Jessups Reserve"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Property address</Label>
              <AddressAutocomplete id="address" required />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clientName">Client / property manager</Label>
              <Input
                id="clientName"
                name="clientName"
                placeholder="Acme Property Management"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Number of buildings, special conditions, etc."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" asChild>
                <Link href="/bids">Cancel</Link>
              </Button>
              <SubmitButton>Create bid</SubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
