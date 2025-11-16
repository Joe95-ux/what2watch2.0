import { redirect } from "next/navigation";

export default async function MyListPage() {
  // Redirect to dashboard version
  redirect("/dashboard/my-list");
}

