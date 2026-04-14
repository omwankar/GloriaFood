import { notFound } from "next/navigation";
import CustomerMenu from "@/components/customer/CustomerMenu";
import { resolveRestaurantBySlug } from "@/lib/restaurant";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ embed?: string }>;
};

export default async function RestaurantStorefrontPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : undefined;
  const match = await resolveRestaurantBySlug(slug);
  if (!match) {
    notFound();
  }

  return <CustomerMenu restaurantId={match.id} embedded={query?.embed === "true"} />;
}
