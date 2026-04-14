import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export default async function MenuLandingPage() {
  const supabase = await createClient();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name")
    .order("name", { ascending: true });
  const { data: settings } = await supabase
    .from("restaurant_setup_settings")
    .select("restaurant_id, public_slug");

  const slugByRestaurantId = Object.fromEntries(
    (settings ?? []).map((setting) => [setting.restaurant_id, setting.public_slug]),
  );

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load restaurants: {error.message}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-zinc-900">Choose Restaurant</h1>
      <p className="mt-1 text-sm text-zinc-600">Select a restaurant to view menu and place order.</p>
      <div className="mt-4 space-y-2">
        {(restaurants ?? []).map((restaurant) => (
          <Link
            key={restaurant.id}
            href={`/r/${slugByRestaurantId[restaurant.id] ?? slugify(restaurant.name)}`}
            className="block rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50"
          >
            {restaurant.name}
          </Link>
        ))}
        {(restaurants ?? []).length === 0 ? (
          <p className="text-sm text-zinc-600">No restaurants available yet.</p>
        ) : null}
      </div>
    </main>
  );
}
