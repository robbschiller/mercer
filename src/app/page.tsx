import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center gap-6 px-4 py-24">
      <h1 className="text-4xl font-bold tracking-tight text-center sm:text-5xl">
        Bid multifamily exteriors
        <br />
        from the parking lot.
      </h1>
      <p className="max-w-md text-center text-muted-foreground text-lg">
        Measure buildings, calculate materials and labor, and generate
        proposals&mdash;all before you leave the property.
      </p>
      <Button asChild size="lg">
        <a href="/bids">Get started</a>
      </Button>
    </div>
  );
}
