import { notFound } from "next/navigation";
import CustomerMenu from "@/components/customer/CustomerMenu";
import { resolveRestaurantBySlug } from "@/lib/restaurant";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EmbedStorefrontPage({ params }: Props) {
  const { slug } = await params;
  const match = await resolveRestaurantBySlug(slug);

  if (!match) {
    notFound();
  }

  return <CustomerMenu restaurantId={match.id} embedded />;
}
