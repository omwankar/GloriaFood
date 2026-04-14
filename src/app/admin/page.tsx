import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminDashboard from "@/components/admin/AdminDashboard";
import type { Restaurant } from "@/types/database";

export default async function AdminPage() {
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
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
          This page is only available for admin users.
        </div>
      </main>
    );
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, logo, owner_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  return (
    <AdminDashboard
      userId={user.id}
      initialRestaurant={restaurant as Restaurant | null}
    />
  );
}
