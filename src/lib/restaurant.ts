import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export async function resolveRestaurantBySlug(slug: string) {
  const supabase = await createClient();

  const { data: restaurants, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name");

  if (restaurantError || !restaurants) {
    return null;
  }

  const directMatch = restaurants.find((restaurant) => slugify(restaurant.name) === slug);
  if (directMatch) {
    return directMatch;
  }

  const { data: settings } = await supabase
    .from("restaurant_setup_settings")
    .select("restaurant_id, public_slug")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!settings) {
    return null;
  }

  return restaurants.find((restaurant) => restaurant.id === settings.restaurant_id) ?? null;
}
