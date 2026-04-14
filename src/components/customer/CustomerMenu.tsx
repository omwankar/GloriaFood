"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, MenuItem, Restaurant } from "@/types/database";

type Props = {
  restaurantId: string;
  embedded?: boolean;
};

type CheckoutForm = {
  customerName: string;
  phone: string;
  address: string;
};

export default function CustomerMenu({ restaurantId, embedded = false }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState<CheckoutForm>({
    customerName: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [specialNote, setSpecialNote] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [isIframeEmbedded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });
  const minimumOrder = 199;

  const menuItemMap = useMemo(
    () => Object.fromEntries(menuItems.map((item) => [item.id, item])),
    [menuItems],
  );
  const embedQueryEnabled = searchParams?.get("embed") === "true";
  const isEmbedded = embedded || embedQueryEnabled || isIframeEmbedded;

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, quantity]) => quantity > 0)
        .map(([id, quantity]) => ({
          item: menuItemMap[id],
          quantity,
        }))
        .filter((entry) => !!entry.item),
    [cart, menuItemMap],
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, entry) => sum + Number(entry.item.price) * entry.quantity,
        0,
      ),
    [cartItems],
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, logo, owner_id")
        .eq("id", restaurantId)
        .maybeSingle();

      if (restaurantError || !restaurantData) {
        setError(restaurantError?.message ?? "Restaurant not found");
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData as Restaurant);

      const { data: categoryData, error: categoryError } = await supabase
        .from("categories")
        .select("id, restaurant_id, name")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true });

      if (categoryError) {
        setError(categoryError.message);
        setLoading(false);
        return;
      }

      const categoryValue = (categoryData as Category[]) ?? [];
      setCategories(categoryValue);
      setActiveCategoryId(categoryValue[0]?.id ?? "");

      const categoryIds = categoryValue.map((category) => category.id);
      if (categoryIds.length === 0) {
        setMenuItems([]);
        setLoading(false);
        return;
      }

      const { data: itemData, error: itemError } = await supabase
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url")
        .in("category_id", categoryIds)
        .order("name", { ascending: true });

      if (itemError) {
        setError(itemError.message);
        setLoading(false);
        return;
      }

      setMenuItems((itemData as MenuItem[]) ?? []);
      setLoading(false);
    };

    load();
  }, [restaurantId, supabase]);

  const sanitizeText = (value: string, maxLength: number) =>
    value
      .trim()
      .replace(/[<>]/g, "")
      .replace(/\s+/g, " ")
      .slice(0, maxLength);

  const sanitizePhone = (value: string) =>
    value
      .replace(/[^\d+\-\s]/g, "")
      .trim()
      .slice(0, 20);

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const nextQty = Math.max(0, (prev[itemId] ?? 0) + delta);
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[itemId];
      } else {
        next[itemId] = nextQty;
      }
      return next;
    });
  };

  const onCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (cartTotal < minimumOrder) {
      setError(`Minimum order is INR ${minimumOrder}. Add more items to continue.`);
      return;
    }

    const cleanName = sanitizeText(checkout.customerName, 80);
    const cleanPhone = sanitizePhone(checkout.phone);
    const cleanAddress = sanitizeText(checkout.address, 240);
    const cleanNote = sanitizeText(specialNote, 180);

    if (!cleanName || !cleanPhone || !cleanAddress) {
      setError("Please fill all checkout fields.");
      return;
    }

    setSubmitting(true);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        customer_name: cleanName,
        phone: cleanPhone,
        address: `${cleanAddress} | ${orderType} | note: ${cleanNote || "N/A"} | payment: ${paymentMethod}`,
        total_price: cartTotal,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !orderData) {
      setSubmitting(false);
      setError(orderError?.message ?? "Failed to create order");
      return;
    }

    const orderItemsPayload = cartItems.map((entry) => ({
      order_id: orderData.id,
      menu_item_id: entry.item.id,
      quantity: entry.quantity,
      price: Number(entry.item.price),
    }));

    const { error: orderItemsError } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    setSubmitting(false);

    if (orderItemsError) {
      setError(orderItemsError.message);
      return;
    }

    setCart({});
    setCheckout({ customerName: "", phone: "", address: "" });
    setSpecialNote("");
    router.push(`/order/${orderData.id}`);
  };

  if (loading) {
    return (
      <main className={`mx-auto ${isEmbedded ? "max-w-full px-3 py-3" : "max-w-6xl px-4 py-8"}`}>
        <p className="text-sm text-zinc-600">Loading menu...</p>
      </main>
    );
  }

  if (error && !restaurant) {
    return (
      <main className={`mx-auto ${isEmbedded ? "max-w-full px-3 py-3" : "max-w-6xl px-4 py-8"}`}>
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </main>
    );
  }

  return (
    <main className={`mx-auto ${isEmbedded ? "max-w-full px-2 py-2" : "max-w-6xl px-4 py-6"}`}>
      {!isEmbedded ? (
        <header className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {restaurant?.logo ? (
              <Image
                src={restaurant.logo}
                alt={`${restaurant.name} logo`}
                width={54}
                height={54}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : null}
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{restaurant?.name}</h1>
              <p className="mt-1 text-sm text-zinc-600">Order online in a few clicks.</p>
            </div>
          </div>
        </header>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className={`mb-4 flex flex-wrap gap-2 ${isEmbedded ? "px-1" : ""}`}>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => setActiveCategoryId(category.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              activeCategoryId === category.id
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 ${isEmbedded ? "lg:grid-cols-1" : "lg:grid-cols-[2fr_1fr]"}`}>
        <section className="space-y-6">
          {categories.map((category) => {
            if (activeCategoryId && activeCategoryId !== category.id) return null;
            const categoryItems = menuItems.filter((item) => item.category_id === category.id);
            if (categoryItems.length === 0) return null;

            return (
              <div
                key={category.id}
                className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${isEmbedded ? "p-3" : "p-4"}`}
              >
                <h2 className="text-lg font-semibold text-zinc-900">{category.name}</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {categoryItems.map((item) => (
                    <article key={item.id} className="rounded-lg border border-zinc-200 p-3">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          width={320}
                          height={180}
                          className="h-32 w-full rounded-md object-cover"
                        />
                      ) : null}
                      <h3 className="mt-2 font-semibold text-zinc-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        INR {Number(item.price).toFixed(2)}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {cart[item.id] ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        >
                          +
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <aside
          id="checkout-cart"
          className={`h-fit rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${
            isEmbedded ? "" : "lg:sticky lg:top-4"
          }`}
        >
          <h2 className="text-lg font-semibold text-zinc-900">Your Cart</h2>
          <div className="mt-3 space-y-2">
            {cartItems.length === 0 ? (
              <p className="text-sm text-zinc-600">No items added yet.</p>
            ) : (
              cartItems.map((entry) => (
                <div key={entry.item.id} className="flex items-start justify-between gap-2 text-sm">
                  <p>
                    {entry.item.name} x {entry.quantity}
                  </p>
                  <p className="font-medium">
                    INR {(Number(entry.item.price) * entry.quantity).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-3 text-sm">
            <div className="flex items-center justify-between font-semibold text-zinc-900">
              <span>Total</span>
              <span>INR {cartTotal.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Minimum order: INR {minimumOrder}</p>
          </div>

          <form className="mt-4 space-y-2" onSubmit={onCheckout}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType("delivery")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  orderType === "delivery"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300"
                }`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setOrderType("pickup")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  orderType === "pickup"
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300"
                }`}
              >
                Pickup
              </button>
            </div>
            <input
              type="text"
              required
              value={checkout.customerName}
              onChange={(e) => setCheckout((prev) => ({ ...prev, customerName: e.target.value }))}
              placeholder="Your name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <input
              type="tel"
              required
              value={checkout.phone}
              onChange={(e) => setCheckout((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <textarea
              required
              value={checkout.address}
              onChange={(e) => setCheckout((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Delivery address"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <textarea
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="Special instructions (optional)"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            >
              <option value="cash_on_delivery">Cash on Delivery</option>
              <option value="upi">UPI (Placeholder)</option>
              <option value="card_at_store">Card at Store (Placeholder)</option>
            </select>
            <button
              type="submit"
              disabled={submitting || cartItems.length === 0 || cartTotal < minimumOrder}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Placing order..." : "Place Order"}
            </button>
          </form>
        </aside>
      </div>

      <a
        href="#checkout-cart"
        className="fixed bottom-5 right-5 z-40 rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-lg"
      >
        Cart ({cartItems.length}) - INR {cartTotal.toFixed(0)}
      </a>
    </main>
  );
}
