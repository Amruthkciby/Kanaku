import { redirect } from "next/navigation";
import { getCurrentProfile, isOwner } from "@/lib/auth";

export default async function BusinessLayout({ children }: LayoutProps<"/business">) {
  const profile = await getCurrentProfile();

  if (!isOwner(profile)) {
    redirect("/family");
  }

  return children;
}
