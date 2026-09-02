import { redirect } from "next/navigation";

/** Import moved to Lists (1b): a CSV is a list, not a batch of contacts. */
export default function ImportContactsPage() {
  redirect("/lists/new");
}
