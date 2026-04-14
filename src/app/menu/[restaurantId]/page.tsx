import CustomerMenu from "@/components/customer/CustomerMenu";

type Props = {
  params: Promise<{ restaurantId: string }>;
};

export default async function RestaurantMenuPage({ params }: Props) {
  const { restaurantId } = await params;
  return <CustomerMenu restaurantId={restaurantId} />;
}
