import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import CopyButton from "@/components/admin/CopyButton";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

function withNoTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export default async function DashboardEmbedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/admin");
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!restaurant) {
    redirect("/admin");
  }

  const { data: settings } = await supabase
    .from("restaurant_setup_settings")
    .select("public_slug")
    .eq("restaurant_id", restaurant.id)
    .maybeSingle();

  const slug = settings?.public_slug?.trim() || slugify(restaurant.name);
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const fallbackOrigin = host ? `${protocol}://${host}` : "https://yourdomain.com";
  const baseUrl = withNoTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL ? process.env.NEXT_PUBLIC_SITE_URL : fallbackOrigin,
  );

  const directUrl = `${baseUrl}/r/${slug}`;
  const gloriaStyleUrl = `${baseUrl}/api/fb/${slug}`;
  const iframeCode = `<iframe 
  src="${directUrl}?embed=true"
  width="100%" 
  height="600" 
  style="border:none;"
></iframe>`;

  const widgetCode = `<script 
  src="${baseUrl}/widget.js"
  data-ordering-slug="${slug}"
  data-button-text="Order Now"
></script>`;
  const linkPopupCode = `<a href="#" data-ordering-link>Order Food</a>
<script 
  src="${baseUrl}/widget.js"
  data-ordering-slug="${slug}"
  data-hide-floating-button="true"
  data-trigger-selector="[data-ordering-link]"
></script>`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <p className="text-sm text-zinc-500">Embed Configuration</p>
        <h1 className="text-2xl font-bold text-zinc-900">Share your public ordering menu</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Use these snippets to add ordering on your website or landing pages.
        </p>
      </header>

      <section className="space-y-5">
        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">1) Direct Link</h2>
            <CopyButton value={directUrl} />
          </div>
          <p className="rounded-md bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
            {directUrl}
          </p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">1.1) GloriaFood-style Share Link</h2>
            <CopyButton value={gloriaStyleUrl} />
          </div>
          <p className="rounded-md bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
            {gloriaStyleUrl}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            This link format matches `/api/fb/{slug}` and redirects to your menu.
          </p>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">2) iFrame Embed Code</h2>
            <CopyButton value={iframeCode} />
          </div>
          <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
            {iframeCode}
          </pre>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">3) JavaScript Widget (Optional)</h2>
            <CopyButton value={widgetCode} />
          </div>
          <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
            {widgetCode}
          </pre>
        </article>

        <article className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-zinc-900">4) Open Popup On Link Click</h2>
            <CopyButton value={linkPopupCode} />
          </div>
          <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-700">
            {linkPopupCode}
          </pre>
        </article>
      </section>

      <div className="mt-6">
        <Link
          href="/admin"
          className="inline-flex rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back to Admin
        </Link>
      </div>
    </main>
  );
}
