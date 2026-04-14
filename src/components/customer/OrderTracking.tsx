"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/types/database";

type Props = {
  orderId: string;
};

const statusMessage: Record<OrderStatus, string> = {
  pending: "Restaurant received your order.",
  preparing: "Your order is being prepared.",
  completed: "Order completed. Thank you!",
};

export default function OrderTracking({ orderId }: Props) {
  const supabase = createClient();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      const { data, error: orderError } = await supabase
        .from("orders")
        .select("id, restaurant_id, customer_name, phone, address, total_price, status, created_at")
        .eq("id", orderId)
        .single();

      setLoading(false);
      if (orderError) {
        setError(orderError.message);
        return;
      }

      setOrder(data as Order);
    };

    loadOrder();
  }, [orderId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((payload.new as Order) ?? null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);

  if (loading) {
    return <p className="text-sm text-zinc-600">Loading order status...</p>;
  }

  if (error || !order) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error ?? "Order not found."}
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-bold text-zinc-900">Order Confirmed</h1>
      <p className="mt-2 text-sm text-zinc-600">Order ID: {order.id}</p>
      <p className="mt-4 text-sm text-zinc-700">
        Current status:{" "}
        <span className="font-semibold capitalize text-zinc-900">{order.status}</span>
      </p>
      <p className="mt-1 text-sm text-zinc-600">{statusMessage[order.status]}</p>
      <div className="mt-4 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700">
        <p>Customer: {order.customer_name}</p>
        <p>Total: INR {Number(order.total_price).toFixed(2)}</p>
      </div>
    </div>
  );
}
