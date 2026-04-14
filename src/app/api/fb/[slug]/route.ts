import { NextResponse } from "next/server";
import { resolveRestaurantBySlug } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const match = await resolveRestaurantBySlug(slug);

  if (!match) {
    return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
  }

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("restaurant_setup_settings")
    .select("public_slug")
    .eq("restaurant_id", match.id)
    .maybeSingle();

  const publicSlug = settings?.public_slug?.trim() || slugify(match.name);
  return NextResponse.redirect(new URL(`/r/${publicSlug}`, _request.url));
}
