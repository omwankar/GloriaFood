import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-zinc-900">
          Restaurant Ordering SaaS
        </h1>
        <p className="mt-3 text-zinc-600">
          MVP admin panel for managing categories, menu items, and incoming
          orders in real-time.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            Admin Login
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/menu"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Customer Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
