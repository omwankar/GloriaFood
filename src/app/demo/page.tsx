import Link from "next/link";
import Script from "next/script";

type Props = {
  searchParams?: Promise<{ slug?: string }>;
};

export default async function DemoWebsitePage({ searchParams }: Props) {
  const query = searchParams ? await searchParams : undefined;
  const slug = query?.slug?.trim() || "my-restaurant";

  return (
    <>
      <main className="min-h-screen bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">Demo Restaurant Site</p>
              <h1 className="text-lg font-bold">Spice Garden</h1>
            </div>
            <nav className="hidden gap-6 text-sm text-zinc-600 md:flex">
              <a href="#menu">Menu</a>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </nav>
            <a
              href="#"
              data-ordering-link
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Order Now
            </a>
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <p className="mb-3 inline-block rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium">
              Fresh Indian Cuisine
            </p>
            <h2 className="text-4xl font-extrabold leading-tight">Taste crafted with authentic spices</h2>
            <p className="mt-4 text-zinc-600">
              This is a dummy website. Clicking Order Now opens your embedded ordering popup.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#"
                data-ordering-link
                className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Open Ordering Popup
              </a>
              <Link
                href={`/r/${slug}`}
                target="_blank"
                className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-800"
              >
                Open Full Storefront
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Popular Dishes</h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-700">
              <li className="rounded-lg bg-zinc-100 px-3 py-2">Paneer Tikka - INR 249</li>
              <li className="rounded-lg bg-zinc-100 px-3 py-2">Butter Chicken - INR 349</li>
              <li className="rounded-lg bg-zinc-100 px-3 py-2">Veg Biryani - INR 299</li>
            </ul>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-6xl px-4 pb-14">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">About</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Replace this page with your real content. Keep `data-ordering-link` on any button/link
              where you want the popup menu to open.
            </p>
          </div>
        </section>
      </main>

      <Script
        src="/widget.js"
        data-ordering-slug={slug}
        data-hide-floating-button="true"
        data-trigger-selector="[data-ordering-link]"
        strategy="afterInteractive"
      />
    </>
  );
}
