"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";
import type {
  Category,
  MenuItem,
  Order,
  OrderItem,
  OrderStatus,
  Restaurant,
} from "@/types/database";

type RawOrderItemRow = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  menu_item: { name: string }[] | { name: string } | null;
};

type Props = {
  userId: string;
  initialRestaurant: Restaurant | null;
};

export default function AdminDashboard({ userId, initialRestaurant }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemsByOrder, setOrderItemsByOrder] = useState<
    Record<string, OrderItem[]>
  >({});

  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurantName, setRestaurantName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: "",
  });
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const fetchData = async (restaurantId: string) => {
    setLoadingData(true);
    setError(null);

    const [{ data: categoryData, error: categoriesError }, { data: menuData, error: menuError }] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id, restaurant_id, name")
          .eq("restaurant_id", restaurantId)
          .order("name", { ascending: true }),
        supabase
          .from("menu_items")
          .select("id, category_id, name, description, price, image_url")
          .order("name", { ascending: true }),
      ]);

    if (categoriesError || menuError) {
      setError(categoriesError?.message ?? menuError?.message ?? "Failed to load data");
      setLoadingData(false);
      return;
    }

    setCategories((categoryData as Category[]) ?? []);

    const validCategoryIds = new Set((categoryData ?? []).map((category) => category.id));
    setMenuItems(
      ((menuData as MenuItem[]) ?? []).filter((item) => validCategoryIds.has(item.category_id)),
    );

    await fetchOrders(restaurantId);
    setLoadingData(false);
  };

  const fetchOrders = async (restaurantId: string) => {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("id, restaurant_id, customer_name, phone, address, total_price, status, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false });

    if (ordersError) {
      setError(ordersError.message);
      return;
    }

    const ordersValue = (ordersData as Order[]) ?? [];
    setOrders(ordersValue);

    if (ordersValue.length === 0) {
      setOrderItemsByOrder({});
      return;
    }

    const orderIds = ordersValue.map((order) => order.id);
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("id, order_id, menu_item_id, quantity, price, menu_item:menu_items(name)")
      .in("order_id", orderIds);

    if (orderItemsError) {
      setError(orderItemsError.message);
      return;
    }

    const normalizedOrderItems: OrderItem[] = ((orderItemsData as RawOrderItemRow[]) ?? []).map(
      (item) => ({
        id: item.id,
        order_id: item.order_id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
        menu_item: Array.isArray(item.menu_item)
          ? (item.menu_item[0] ?? null)
          : (item.menu_item ?? null),
      }),
    );

    const grouped = normalizedOrderItems.reduce(
      (acc: Record<string, OrderItem[]>, item) => {
        acc[item.order_id] = [...(acc[item.order_id] ?? []), item];
        return acc;
      },
      {},
    );

    setOrderItemsByOrder(grouped);
  };

  useEffect(() => {
    if (!restaurant?.id) {
      return;
    }

    fetchData(restaurant.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurant?.id) {
      return;
    }

    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        async () => {
          await fetchOrders(restaurant.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  const handleCreateRestaurant = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurantName.trim()) return;

    setSaving(true);
    setError(null);

    const { data, error: createError } = await supabase
      .from("restaurants")
      .insert({
        name: restaurantName.trim(),
        owner_id: userId,
      })
      .select("id, name, logo, owner_id")
      .single();

    setSaving(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    setRestaurant(data as Restaurant);
    setRestaurantName("");
  };

  const handleCreateCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !categoryName.trim()) return;

    setSaving(true);
    const { error: createError } = await supabase.from("categories").insert({
      restaurant_id: restaurant.id,
      name: categoryName.trim(),
    });
    setSaving(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    setCategoryName("");
    await fetchData(restaurant.id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!restaurant) return;
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await fetchData(restaurant.id);
  };

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!restaurant || !itemForm.categoryId || !itemForm.name.trim() || !itemForm.price) return;

    setSaving(true);
    setError(null);

    let imageUrl: string | null = null;

    if (itemImage) {
      const imagePath = `${userId}/${Date.now()}-${itemImage.name.replace(/\s+/g, "-")}`;
      const { error: uploadError } = await supabase.storage
        .from("menu-images")
        .upload(imagePath, itemImage, { upsert: false });

      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }

      const { data: imageData } = supabase.storage.from("menu-images").getPublicUrl(imagePath);
      imageUrl = imageData.publicUrl;
    }

    const { error: insertError } = await supabase.from("menu_items").insert({
      category_id: itemForm.categoryId,
      name: itemForm.name.trim(),
      description: itemForm.description.trim() || null,
      price: Number(itemForm.price),
      image_url: imageUrl,
    });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setItemForm({ categoryId: "", name: "", description: "", price: "" });
    setItemImage(null);
    await fetchData(restaurant.id);
  };

  const handleDeleteItem = async (id: string) => {
    if (!restaurant) return;
    const { error: deleteError } = await supabase.from("menu_items").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await fetchData(restaurant.id);
  };

  const handleOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!restaurant) return;
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await fetchOrders(restaurant.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const handleSeedDemoData = async () => {
    if (!restaurant) return;

    setSeeding(true);
    setError(null);

    const demoCategories = ["Starters", "Main Course", "Beverages"];

    const { error: categorySeedError } = await supabase.from("categories").upsert(
      demoCategories.map((name) => ({
        restaurant_id: restaurant.id,
        name,
      })),
      { onConflict: "restaurant_id,name" },
    );

    if (categorySeedError) {
      setSeeding(false);
      setError(categorySeedError.message);
      return;
    }

    const { data: seededCategories, error: fetchCategoryError } = await supabase
      .from("categories")
      .select("id, name")
      .eq("restaurant_id", restaurant.id);

    if (fetchCategoryError) {
      setSeeding(false);
      setError(fetchCategoryError.message);
      return;
    }

    const byName = Object.fromEntries((seededCategories ?? []).map((c) => [c.name, c.id]));
    const seededItems = [
      {
        category_id: byName["Starters"],
        name: "Paneer Tikka",
        description: "Smoky paneer cubes with mint chutney.",
        price: 249,
      },
      {
        category_id: byName["Starters"],
        name: "Crispy Corn",
        description: "Spicy fried corn with herbs.",
        price: 179,
      },
      {
        category_id: byName["Main Course"],
        name: "Butter Chicken",
        description: "Creamy tomato gravy with tender chicken.",
        price: 349,
      },
      {
        category_id: byName["Main Course"],
        name: "Veg Biryani",
        description: "Fragrant basmati rice with mixed vegetables.",
        price: 299,
      },
      {
        category_id: byName["Beverages"],
        name: "Cold Coffee",
        description: "Chilled coffee with vanilla ice cream.",
        price: 159,
      },
    ].filter((item) => Boolean(item.category_id));

    if (seededItems.length > 0) {
      const { error: itemsSeedError } = await supabase.from("menu_items").insert(seededItems);
      if (itemsSeedError) {
        setSeeding(false);
        setError(itemsSeedError.message);
        return;
      }
    }

    const { data: allMenuItems, error: menuItemsError } = await supabase
      .from("menu_items")
      .select("id, name, price")
      .in("category_id", Object.values(byName));

    if (menuItemsError || !allMenuItems || allMenuItems.length === 0) {
      setSeeding(false);
      setError(menuItemsError?.message ?? "Menu items not found after seeding.");
      return;
    }

    const firstItem = allMenuItems[0];
    const secondItem = allMenuItems[1] ?? allMenuItems[0];

    const demoOrderItems = [
      { menu_item_id: firstItem.id, quantity: 2, price: Number(firstItem.price) },
      { menu_item_id: secondItem.id, quantity: 1, price: Number(secondItem.price) },
    ];
    const demoTotal = demoOrderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const { data: createdOrder, error: orderSeedError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurant.id,
        customer_name: "Rahul Sharma",
        phone: "9876543210",
        address: "221B Baker Street, Delhi",
        total_price: demoTotal,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderSeedError || !createdOrder) {
      setSeeding(false);
      setError(orderSeedError?.message ?? "Failed to seed demo order.");
      return;
    }

    const { error: orderItemsSeedError } = await supabase.from("order_items").insert(
      demoOrderItems.map((item) => ({
        order_id: createdOrder.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: item.price,
      })),
    );

    if (orderItemsSeedError) {
      setSeeding(false);
      setError(orderItemsSeedError.message);
      return;
    }

    setSeeding(false);
    await fetchData(restaurant.id);
  };

  if (!restaurant) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">
            Create Your Restaurant
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            First-time setup: add your restaurant brand name.
          </p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreateRestaurant}>
            <input
              type="text"
              required
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. Spice Garden"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-zinc-400 focus:ring"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create"}
            </button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Admin Dashboard</p>
          <h1 className="text-2xl font-bold text-zinc-900">{restaurant.name}</h1>
          <Link
            href={`/r/${slugify(restaurant.name)}`}
            target="_blank"
            className="mt-1 inline-block text-xs text-zinc-600 underline"
          >
            Open Storefront
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/embed"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Embed Tools
          </Link>
          <Link
            href="/admin/setup"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Setup Module
          </Link>
          <button
            type="button"
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Logout
          </button>
        </div>
      </header>

      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {loadingData ? <p className="mb-4 text-sm text-zinc-600">Loading dashboard...</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Categories</h2>
          <form className="mt-3 flex gap-2" onSubmit={handleCreateCategory}>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Add category"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Add
            </button>
          </form>
          <ul className="mt-4 space-y-2">
            {categories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm"
              >
                <span>{category.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Add Menu Item</h2>
          <form className="mt-3 space-y-3" onSubmit={handleCreateItem}>
            <select
              required
              value={itemForm.categoryId}
              onChange={(e) => setItemForm((prev) => ({ ...prev, categoryId: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={itemForm.name}
              onChange={(e) => setItemForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Item name"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <textarea
              value={itemForm.description}
              onChange={(e) =>
                setItemForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Description"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={itemForm.price}
              onChange={(e) => setItemForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Price"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setItemImage(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? "Saving..." : "Save item"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Menu Items</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {menuItems.map((item) => (
            <article key={item.id} className="rounded-lg border border-zinc-200 p-3">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={300}
                  height={160}
                  className="h-32 w-full rounded-md object-cover"
                />
              ) : null}
              <h3 className="mt-2 font-semibold text-zinc-900">{item.name}</h3>
              <p className="text-xs text-zinc-500">{categoryMap[item.category_id] ?? "-"}</p>
              <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
              <p className="mt-1 text-sm font-medium text-zinc-800">
                INR {Number(item.price).toFixed(2)}
              </p>
              <button
                type="button"
                onClick={() => handleDeleteItem(item.id)}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Incoming Orders (Realtime)</h2>
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">{order.customer_name}</p>
                  <p className="text-sm text-zinc-600">{order.phone}</p>
                  <p className="text-sm text-zinc-600">{order.address}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">
                    INR {Number(order.total_price).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <ul className="mt-2 list-inside list-disc text-sm text-zinc-700">
                {(orderItemsByOrder[order.id] ?? []).map((item) => (
                  <li key={item.id}>
                    {item.menu_item?.name ?? "Item"} x {item.quantity} - INR{" "}
                    {Number(item.price).toFixed(2)}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center gap-2">
                <select
                  value={order.status}
                  onChange={(e) => handleOrderStatus(order.id, e.target.value as OrderStatus)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                >
                  <option value="pending">pending</option>
                  <option value="preparing">preparing</option>
                  <option value="completed">completed</option>
                </select>
              </div>
            </article>
          ))}
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-600">No orders yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
