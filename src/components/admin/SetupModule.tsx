"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

type Props = {
  restaurantId: string;
  restaurantName: string;
};

const setupSections = [
  "Restaurant basics",
  "Services & opening hours",
  "Payment methods & taxes",
];

const takingOrderSections = ["Order taking app", "Alert call", "Menu setup", "Publishing"];

export default function SetupModule({ restaurantId, restaurantName }: Props) {
  const supabase = createClient();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customSlug, setCustomSlug] = useState(slugify(restaurantName));
  const [minimumOrder, setMinimumOrder] = useState("199");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const storefrontLink = `${appUrl}/r/${customSlug || slugify(restaurantName)}`;
  const embedLink = `${appUrl}/embed/${customSlug || slugify(restaurantName)}`;
  const popupScriptTag = `<script src="${appUrl}/menu-popup.js" data-menu-url="${embedLink}" data-button-text="Order Online"></script>`;

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("restaurant_setup_settings")
        .select("public_slug, alert_phone, min_order")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (!data) return;
      setCustomSlug(data.public_slug ?? slugify(restaurantName));
      setPhoneNumber(data.alert_phone ?? "");
      setMinimumOrder(String(data.min_order ?? 199));
    };

    loadSettings();
  }, [restaurantId, restaurantName, supabase]);

  const onSaveAlertCall = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!restaurantId) {
      setError("Create a restaurant first from admin dashboard.");
      return;
    }
    setSaving(true);

    const cleanedSlug = slugify(customSlug || restaurantName);
    const { error: saveError } = await supabase.from("restaurant_setup_settings").upsert({
      restaurant_id: restaurantId,
      public_slug: cleanedSlug,
      alert_phone: phoneNumber.trim() || null,
      min_order: Number(minimumOrder) || 199,
      ordering_enabled: true,
      updated_at: new Date().toISOString(),
    });

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    setSaving(false);
    setMessage("Setup settings saved. Share link and popup embed are ready.");
  };

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setMessage("Copied to clipboard.");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Setup</p>
          <h1 className="text-xl font-semibold text-zinc-900">{restaurantName}</h1>
        </div>
        <button className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          Next
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">SETUP</h2>
          <ul className="space-y-2">
            {setupSections.map((section) => (
              <li key={section} className="rounded-md px-2 py-1 text-sm text-zinc-700">
                {section}
              </li>
            ))}
          </ul>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-zinc-500">TAKING ORDERS</h3>
          <ul className="space-y-2">
            {takingOrderSections.map((section) => (
              <li
                key={section}
                className={`rounded-md px-2 py-1 text-sm ${
                  section === "Alert call"
                    ? "bg-zinc-900 font-medium text-white"
                    : "text-zinc-700"
                }`}
              >
                {section}
              </li>
            ))}
          </ul>
        </aside>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mx-auto max-w-2xl rounded-lg border border-zinc-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Alert call</h2>
              <button className="rounded bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                Next
              </button>
            </div>

            <p className="mb-4 text-sm text-zinc-600">
              Get an alert call in case an order could not be pushed to the order taking app in
              real-time.
            </p>

            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-400 text-white">
                ▶
              </span>
              Play notification
            </button>

            <form className="space-y-3" onSubmit={onSaveAlertCall}>
              <label className="block text-sm font-medium text-zinc-700">
                Phone number of ordering supervisor in the restaurant:
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="Phone number (optional)"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
              />
              <label className="block text-sm font-medium text-zinc-700">
                Public link slug (customize your shared link):
              </label>
              <input
                type="text"
                value={customSlug}
                onChange={(event) => setCustomSlug(event.target.value)}
                placeholder="your-restaurant-link"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
              />
              <label className="block text-sm font-medium text-zinc-700">
                Minimum order (INR):
              </label>
              <input
                type="number"
                min="0"
                value={minimumOrder}
                onChange={(event) => setMinimumOrder(event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save alert call"}
              </button>
            </form>

            <div className="mt-5 space-y-3 rounded-lg border border-zinc-200 p-3">
              <h3 className="text-sm font-semibold text-zinc-900">Share & Embed</h3>
              <div>
                <p className="text-xs text-zinc-500">Direct link for website / social media</p>
                <div className="mt-1 flex gap-2">
                  <input
                    readOnly
                    value={storefrontLink}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyText(storefrontLink)}
                    className="rounded-md border border-zinc-300 px-3 py-2 text-xs"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Popup menu embed script (put on website)</p>
                <textarea
                  readOnly
                  value={popupScriptTag}
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-xs"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() => copyText(popupScriptTag)}
                  className="mt-2 rounded-md border border-zinc-300 px-3 py-2 text-xs"
                >
                  Copy Embed Code
                </button>
              </div>
            </div>

            {message ? <p className="mt-3 text-sm text-green-600">{message}</p> : null}
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
