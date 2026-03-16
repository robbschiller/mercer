import { getUserDefaults } from "@/lib/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { DefaultsForm } from "@/components/defaults-form";

export default async function SettingsPage() {
  const defaults = await getUserDefaults();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company pricing defaults</CardTitle>
          <CardDescription>
            Default rates and margins applied to new bids.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DefaultsForm
            initialValues={{
              coverageSqftPerGallon:
                defaults?.coverageSqftPerGallon ?? null,
              pricePerGallon: defaults?.pricePerGallon ?? null,
              laborRatePerUnit: defaults?.laborRatePerUnit ?? null,
              marginPercent: defaults?.marginPercent ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
