import { redirect } from "next/navigation";

// The takeoff queue is a Pipeline stage now (IA rework) — this route only
// survives for old links.
export default function TakeoffQueuePage() {
  redirect("/pipeline?stage=needs_takeoff");
}
