import { redirect } from "next/navigation";

export default function PropertiesIndexPage() {
  redirect("/leads?view=property");
}
