import { Link, useNavigate } from "@tanstack/react-router";
import { Package, ClipboardList, LogOut, ExternalLink, Copy } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface SellerLite {
  business_name: string;
  slug: string;
  logo_url: string | null;
}

export function DashboardShell({
  seller,
  active,
  children,
}: {
  seller: SellerLite;
  active: "products" | "orders";
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const shopUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${seller.slug}`
      : `/s/${seller.slug}`;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  function copyLink() {
    navigator.clipboard.writeText(shopUrl);
    toast.success("Shop link copied");
  }

  const initials = seller.business_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          {seller.logo_url ? (
            <img src={seller.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials || "S"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-semibold leading-tight">
              {seller.business_name}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <span className="truncate">/s/{seller.slug}</span>
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <a
            href={`/s/${seller.slug}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full flex gap-2 justify-center items-center border border-border bg-card p-2 hover:bg-accent"
            title="View shop"
          >
            View Shop
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={signOut}
            className="rounded-full justify-center items-center gap-2 flex border border-border bg-card p-2 hover:bg-accent"
            title="Sign out"
          >
            Log Out
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
          <TabLink
            to="/dashboard/products"
            active={active === "products"}
            icon={<Package className="h-4 w-4" />}
          >
            Products
          </TabLink>
          <TabLink
            to="/dashboard/orders"
            active={active === "orders"}
            icon={<ClipboardList className="h-4 w-4" />}
          >
            Orders
          </TabLink>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function TabLink({
  to,
  active,
  icon,
  children,
}: {
  to: string;
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
