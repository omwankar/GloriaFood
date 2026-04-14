import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetupModule from "@/components/admin/SetupModule";

export default async function AdminSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/admin");
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <SetupModule
      restaurantId={restaurant?.id ?? ""}
      restaurantName={restaurant?.name ?? "Restaurant Setup"}
    />
  );
}
