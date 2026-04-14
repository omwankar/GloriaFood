import OrderTracking from "@/components/customer/OrderTracking";

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderTrackingPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <OrderTracking orderId={orderId} />
    </main>
  );
}
