"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { updateCompanyProfileAction } from "@/lib/actions";
import type { CompanyProfile } from "@/lib/store";

export function CompanyDetailsForm({
  profile,
}: {
  profile: CompanyProfile | null;
}) {
  return (
    <form
      action={updateCompanyProfileAction}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="websiteUrl">Website</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="text"
          placeholder="example.com"
          defaultValue={profile?.websiteUrl ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="companyName">Company name</Label>
        <Input
          id="companyName"
          name="companyName"
          defaultValue={profile?.companyName ?? ""}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="tagline">Tagline</Label>
        <Input
          id="tagline"
          name="tagline"
          defaultValue={profile?.tagline ?? ""}
          placeholder="One-line pitch shown on your bid PDF"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="street">Street</Label>
        <Input
          id="street"
          name="street"
          defaultValue={profile?.street ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={profile?.city ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            defaultValue={profile?.state ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" name="zip" defaultValue={profile?.zip ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile?.phone ?? ""}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={profile?.email ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          name="logoUrl"
          defaultValue={profile?.logoUrl ?? ""}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="primaryColor">Primary color</Label>
          <div className="flex items-center gap-2">
            <Input
              id="primaryColor"
              name="primaryColor"
              type="color"
              defaultValue={profile?.primaryColor ?? "#1a1a1a"}
              className="h-9 w-14 cursor-pointer p-1"
            />
            <span className="text-xs text-muted-foreground">
              {profile?.primaryColor ?? "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="accentColor">Accent color</Label>
          <div className="flex items-center gap-2">
            <Input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={profile?.accentColor ?? "#1a1a1a"}
              className="h-9 w-14 cursor-pointer p-1"
            />
            <span className="text-xs text-muted-foreground">
              {profile?.accentColor ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bodyFont">Body font</Label>
        <Input
          id="bodyFont"
          name="bodyFont"
          defaultValue={profile?.bodyFont ?? ""}
          placeholder="Inter, system-ui, sans-serif"
        />
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}
