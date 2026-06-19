import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  head: () => ({ meta: [{ title: "Products — Shoplink" }] }),
  component: ProductsPage,
});

interface ProductForm {
  id?: string;
  name: string;
  price: string;
  stock_qty: string;
  is_active: boolean;
  image_url: string | null;
  image_file?: File | null;
}

const emptyForm: ProductForm = { name: "", price: "", stock_qty: "0", is_active: true, image_url: null };

function ProductsPage() {
  const navigate = useNavigate();
  const { data: seller, isLoading: sLoading } = useSeller();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);

  if (sLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!seller) {
    navigate({ to: "/onboarding" });
    return null;
  }

  return (
    <DashboardShell seller={seller} active="products">
      <ProductGrid seller={seller} onEdit={setEditing} onAdd={() => setEditing({ ...emptyForm })} />
      {editing && (
        <ProductDialog
          seller={seller}
          form={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["my-products"] });
          }}
        />
      )}
    </DashboardShell>
  );
}

function ProductGrid({
  seller,
  onAdd,
  onEdit,
}: {
  seller: { id: string; currency: string };
  onAdd: () => void;
  onEdit: (f: ProductForm) => void;
}) {
  const qc = useQueryClient();
  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products", seller.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["my-products"] });
    },
  });

  if (isLoading) return <div className="py-10 text-center text-muted-foreground">Loading…</div>;

  if (!products || products.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <ImageIcon className="h-6 w-6 text-accent-foreground" />
        </div>
        <h2 className="mt-4 font-display text-2xl">A photo, a name, a price.</h2>
        <p className="mt-1 text-sm text-muted-foreground">That's it.</p>
        <Button onClick={onAdd} size="lg" className="mt-6 rounded-full">
          <Plus className="mr-1.5 h-4 w-4" /> Add product
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl">Products</h1>
        <Button onClick={onAdd} className="rounded-full">
          <Plus className="mr-1.5 h-4 w-4" /> Add
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className={`group overflow-hidden rounded-2xl border border-border bg-card ${!p.is_active ? "opacity-60" : ""}`}>
            <div className="aspect-square w-full bg-muted">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-medium">{p.name}</div>
              <div className="mt-0.5 text-sm text-primary">{formatMoney(Number(p.price), seller.currency)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.stock_qty} in stock</div>
              <div className="mt-2 flex gap-1">
                <button
                  onClick={() =>
                    onEdit({
                      id: p.id,
                      name: p.name,
                      price: String(p.price),
                      stock_qty: String(p.stock_qty),
                      is_active: p.is_active,
                      image_url: p.image_url,
                    })
                  }
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove ${p.name}?`)) del.mutate(p.id);
                  }}
                  className="flex items-center justify-center rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDialog({
  seller,
  form,
  onClose,
  onSaved,
}: {
  seller: { id: string };
  form: ProductForm;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<ProductForm>(form);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(form.image_url);

  async function save() {
    if (!f.name || !f.price) {
      toast.error("Name and price required");
      return;
    }
    setSaving(true);
    try {
      let image_url = f.image_url;
      if (f.image_file) {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) throw new Error("Sign in required");
        const path = `${u.user.id}/p-${Date.now()}-${f.image_file.name}`;
        const { error: upErr } = await supabase.storage.from("shop-assets").upload(path, f.image_file, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage.from("shop-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        image_url = signed?.signedUrl ?? null;
      }
      const payload = {
        seller_id: seller.id,
        name: f.name,
        price: Number(f.price),
        stock_qty: Number(f.stock_qty) || 0,
        is_active: f.is_active,
        image_url,
      };
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
      toast.success("Saved");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{f.id ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>

        <label className="block cursor-pointer">
          <div className="aspect-square w-full overflow-hidden rounded-2xl border border-dashed border-border bg-muted">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <Upload className="h-6 w-6" />
                <span className="mt-2 text-xs">Tap to add a photo</span>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setF({ ...f, image_file: file });
              setPreview(file ? URL.createObjectURL(file) : preview);
            }}
          />
        </label>

        <div className="space-y-3">
          <div>
            <Label htmlFor="n">Name</Label>
            <Input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p">Price</Label>
              <Input id="p" type="number" min="0" step="0.01" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="s">Stock</Label>
              <Input id="s" type="number" min="0" value={f.stock_qty} onChange={(e) => setF({ ...f, stock_qty: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <Label htmlFor="active" className="cursor-pointer text-sm">Visible in shop</Label>
            <Switch id="active" checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="rounded-full">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
