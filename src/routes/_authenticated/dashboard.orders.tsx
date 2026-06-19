import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { DashboardShell } from "@/components/dashboard-shell";
import { formatMoney, formatDate, formatTime } from "@/lib/format";
import { buildWhatsappReplyLink } from "@/lib/whatsapp";
import { MessageCircle, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ title: "Orders — Shoplink" }] }),
  component: OrdersPage,
});

interface OrderRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: { product_name: string; quantity: number }[];
}

function OrdersPage() {
  const navigate = useNavigate();
  const { data: seller, isLoading: sl } = useSeller();
  const { data: orders, isLoading: ol } = useQuery({
    queryKey: ["my-orders", seller?.id],
    enabled: !!seller,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, status, total_amount, created_at, order_items(product_name, quantity)")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OrderRow[];
    },
  });

  if (sl) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!seller) {
    navigate({ to: "/onboarding" });
    return null;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRevenue = (orders ?? [])
    .filter((o) => new Date(o.created_at) >= monthStart && o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const pending = (orders ?? []).filter((o) => o.status === "pending").length;

  // group by day
  const groups: Record<string, OrderRow[]> = {};
  for (const o of orders ?? []) {
    const key = formatDate(o.created_at);
    (groups[key] ||= []).push(o);
  }

  return (
    <DashboardShell seller={seller} active="orders">
      <h1 className="font-display text-2xl">Orders</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">This month</div>
          <div className="mt-1 font-display text-2xl">{formatMoney(monthRevenue, seller.currency)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
          <div className="mt-1 font-display text-2xl">{pending}</div>
        </div>
      </div>

      {ol ? (
        <div className="py-10 text-center text-muted-foreground">Loading…</div>
      ) : !orders || orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-3xl border-2 border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Share your link — orders will appear here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(groups).map(([day, items]) => (
            <div key={day}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</div>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {items.map((o, i) => {
                  const summary = o.order_items.map((it) => `${it.quantity}× ${it.product_name}`).join(", ");
                  const wa = buildWhatsappReplyLink({
                    number: o.customer_phone,
                    customerName: o.customer_name,
                    orderSummary: summary,
                  });
                  return (
                    <a
                      key={o.id}
                      href={o.status === "pending" ? wa : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-border" : ""} ${
                        o.status === "pending" ? "hover:bg-accent" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate font-medium">{o.customer_name}</div>
                          <StatusBadge status={o.status} />
                        </div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">{summary}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{formatTime(o.created_at)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatMoney(Number(o.total_amount), seller.currency)}</div>
                        {o.status === "pending" && (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-whatsapp">
                            <MessageCircle className="h-3 w-3" /> Reply
                          </div>
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-pending text-pending-foreground",
    confirmed: "bg-success text-success-foreground",
    fulfilled: "bg-success text-success-foreground",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}
