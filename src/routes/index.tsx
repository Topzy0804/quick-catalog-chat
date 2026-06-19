import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shoplink — your WhatsApp shop, in one link" },
      { name: "description", content: "A photo, a name, a price. Share one link, take orders in WhatsApp." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="font-display text-2xl font-semibold tracking-tight">
          shop<span className="text-primary">link</span>
        </div>
        <Link
          to="/auth"
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <MessageCircle className="h-3.5 w-3.5" /> Built for WhatsApp sellers
        </p>
        <h1 className="mt-6 text-4xl leading-[1.05] sm:text-6xl">
          Your shop,<br />
          <span className="text-primary italic">in a single link.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          No more "send your account number" chaos. Add a photo, a name, a price.
          Share one link — orders land in your WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition hover:opacity-95"
          >
            Create my shop link <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/s/$slug"
            params={{ slug: "demo" }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-base font-medium hover:bg-accent"
          >
            See a demo shop
          </Link>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            { n: "1", t: "Add products", d: "A photo, a name, a price. Takes a minute." },
            { n: "2", t: "Share your link", d: "your.shop/yourname — paste it in bio, status, anywhere." },
            { n: "3", t: "Reply in WhatsApp", d: "Orders open a prefilled chat. No new app to check." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-5">
              <div className="font-display text-3xl text-primary">{s.n}</div>
              <h3 className="mt-2 text-base font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
