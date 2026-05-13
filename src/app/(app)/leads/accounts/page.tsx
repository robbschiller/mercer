import { redirect } from "next/navigation";

export default function AccountsIndexPage() {
  redirect("/leads?view=property");
}
