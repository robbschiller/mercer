import { redirect } from "next/navigation";

export default function ContactsIndexPage() {
  redirect("/leads?view=contact");
}
