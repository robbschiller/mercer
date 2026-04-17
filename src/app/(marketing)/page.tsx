import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  Calculator,
  ClipboardList,
  Copy,
  FileText,
  Ruler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/supabase/auth-cache";

const features = [
  {
    icon: Building2,
    title: "Add buildings as you walk",
    description:
      "Create building types on-site. Six-unit 3-story, breezeway, parking covers — whatever the property has, add it.",
  },
  {
    icon: Ruler,
    title: "Enter dimensions naturally",
    description:
      'Type "90 × 33" and get 2,970 sqft. Add multiple groups with "+". The app computes totals the way you already think.',
  },
  {
    icon: Copy,
    title: '"25 buildings like this one"',
    description:
      "Set a count on any building type. Measurements multiply automatically — no re-entering the same numbers.",
  },
  {
    icon: ClipboardList,
    title: "Surface presets",
    description:
      "Front, Back, Side A, Posts, Porch Ceilings, Catwalks — pick from common surfaces or type your own.",
  },
  {
    icon: Calculator,
    title: "Live bid totals",
    description:
      "Every measurement updates the running total. See per-building and property-wide square footage in real time.",
  },
  {
    icon: FileText,
    title: "Proposal PDF",
    description:
      "Generate a per-building breakdown that shows property managers you did your homework. Coming soon.",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/bids");

  return (
    <>
      <section className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-24 sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-center sm:text-5xl max-w-2xl">
          Bid multifamily exteriors
          <br />
          from the parking lot.
        </h1>
        <p className="max-w-lg text-center text-muted-foreground text-lg">
          Measure buildings, calculate materials and labor, and generate
          proposals&mdash;all before you leave the property.
        </p>
        <Button asChild size="lg">
          <Link href="/signup">Get started</Link>
        </Button>
      </section>

      <section className="border-t bg-muted/40">
        <div className="container mx-auto px-4 py-20 sm:py-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Built for the walk-through
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              No blueprints needed. No re-entering data at home. Mercer is
              purpose-built for contractors measuring on-site at multifamily
              properties.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 p-6 rounded-xl bg-background border">
                <feature.icon className="h-5 w-5 text-foreground" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-20 sm:py-24 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Stop measuring twice
          </h2>
          <p className="text-muted-foreground max-w-md">
            Create your free account and start building bids on-site. No credit
            card required.
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Create free account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">Mercer</span>
            <span className="text-sm text-muted-foreground">
              &middot; Multifamily exterior bids
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Mercer. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}
