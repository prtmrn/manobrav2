import { redirect } from "next/navigation";

export default function MapPage() {
  redirect("/recherche?vue=carte");
}
