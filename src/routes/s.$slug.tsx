import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { MessageCircle, Minus, Plus, ImageIcon, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import { buildWhatsappOrderLink, normalizeWhatsappNumber } from "@/lib/whatsapp";

interface SellerPublic {
  id: string;
  business_name: string;
  slug: string;
  whatsapp_number: string;
  logo_url: string | null;
  currency: string;
}
interface ProductPublic {
  id: string;
  name: string;
  price: number;
  stock_qty: number;
  image_url: string | null;
}

const shopQuery = (slug: string) =>
  queryOptions({
    queryKey: ["shop", slug],
    queryFn: async () => {
      const { data: seller, error } = await supabase
        .from("sellers")
        .select("id, business_name, slug, whatsapp_number, logo_url, currency")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!seller) return null;
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, name, price, stock_qty, image_url")
        .eq("seller_id", seller.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (pErr) throw pErr;
      return { seller: seller as SellerPublic, products: (products ?? []) as ProductPublic[] };
    },
  });

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(shopQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.seller.business_name} — Shopperlink` : "Shop" },
      {
        name: "description",
        content: loaderData ? `Order from ${loaderData.seller.business_name} on WhatsApp.` : "",
      },
      { property: "og:title", content: loaderData?.seller.business_name ?? "Shop" },
      {
        property: "og:description",
        content: loaderData ? `Order from ${loaderData.seller.business_name} on WhatsApp.` : "",
      },
      ...(loaderData?.seller.logo_url
        ? [{ property: "og:image", content: loaderData.seller.logo_url }]
        : []),
    ],
  }),
  component: Storefront,
});

function Storefront() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(shopQuery(slug));
  if (!data) return null;
  const { seller, products } = data;
  const [interest, setInterest] = useState<Record<string, number>>({});

  const items = useMemo(
    () =>
      products
        .filter((p) => (interest[p.id] ?? 0) > 0)
        .map((p) => ({ name: p.name, price: Number(p.price), qty: interest[p.id] })),
    [interest, products],
  );
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  const initials = seller.business_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function bump(id: string, delta: number, max: number) {
    setInterest((prev) => {
      const next = Math.max(0, Math.min(max, (prev[id] ?? 0) + delta));
      return { ...prev, [id]: next };
    });
  }

  async function placeOrder() {
    if (items.length === 0) return;
    const customer_name = prompt("Your name?") ?? "";
    if (!customer_name.trim()) return;
    // Best-effort log; storefront still works on failure
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          seller_id: seller.id,
          customer_name,
          customer_phone: "",
          total_amount: total,
          payment_method: "whatsapp_manual",
        })
        .select()
        .single();
      if (!error && order) {
        await supabase.from("order_items").insert(
          items.map((it) => {
            const p = products.find((x) => x.name === it.name)!;
            return {
              order_id: order.id,
              product_id: p.id,
              product_name: it.name,
              quantity: it.qty,
              price_at_order: it.price,
            };
          }),
        );
      }
    } catch {
      // ignore — WhatsApp link is the source of truth
    }
    const link = buildWhatsappOrderLink({
      number: seller.whatsapp_number,
      businessName: seller.business_name,
      items,
      currency: seller.currency,
      customerName: customer_name,
    });
    window.location.href = link;
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="mx-auto max-w-2xl px-5 pt-10">
        <div className="flex items-center gap-4">
          {seller.logo_url ? (
            <img src={seller.logo_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
              {initials || "S"}
            </div>
          )}
          <div>
            <h1 className="font-display text-2xl leading-tight">{seller.business_name}</h1>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> usually replies in minutes
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-8 max-w-2xl px-5">
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
            New shop — products coming soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => {
              const qty = interest[p.id] ?? 0;
              const low = p.stock_qty > 0 && p.stock_qty <= 3;
              const out = p.stock_qty <= 0;
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="relative aspect-square bg-muted">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-7 w-7" />
                      </div>
                    )}
                    {out && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-medium">
                        Sold out
                      </div>
                    )}
                    {!out && low && (
                      <span className="absolute left-2 top-2 rounded-full bg-pending px-2 py-0.5 text-[10px] font-medium text-pending-foreground">
                        {p.stock_qty} left
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-sm text-primary">
                      {formatMoney(Number(p.price), seller.currency)}
                    </div>
                    {!out && (
                      <div className="mt-2 flex items-center justify-between rounded-full bg-secondary px-1 py-1">
                        <button
                          onClick={() => bump(p.id, -1, p.stock_qty)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-card disabled:opacity-30"
                          disabled={qty === 0}
                          aria-label="Less"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-sm font-medium">{qty}</span>
                        <button
                          onClick={() => bump(p.id, 1, p.stock_qty)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-card hover:bg-accent disabled:opacity-30"
                          disabled={qty >= p.stock_qty}
                          aria-label="More"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by <span className="font-medium text-foreground">Shopperlink</span>
        </p>
      </main>

      {seller.whatsapp_number && normalizeWhatsappNumber(seller.whatsapp_number).length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button
              onClick={placeOrder}
              disabled={count === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-5 py-3.5 text-base font-medium text-whatsapp-foreground shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageCircle className="h-5 w-5" />
              {count === 0
                ? "Tap items, then order on WhatsApp"
                : `Order ${count} item${count > 1 ? "s" : ""} on WhatsApp · ${formatMoney(total, seller.currency)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
