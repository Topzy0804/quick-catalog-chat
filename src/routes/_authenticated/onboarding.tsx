import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Set up your shop — Shoplink" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If they already have a shop, skip to dashboard
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (seller) navigate({ to: "/dashboard/products" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!touched) setSlug(slugify(businessName));
  }, [businessName, touched]);

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setLogoFile(f);
    setLogoPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessName || !slug || !whatsapp) return;
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      let logo_url: string | null = null;
      if (logoFile) {
        const path = `${u.user.id}/logo-${Date.now()}-${logoFile.name}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("logos")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        logo_url = signed?.signedUrl ?? null;
      }

      const { error } = await supabase.from("sellers").insert({
        user_id: u.user.id,
        business_name: businessName,
        slug,
        whatsapp_number: whatsapp,
        logo_url,
      });
      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("That shop link is taken — try another.");
          return;
        }
        throw error;
      }
      toast.success("Shop link ready!");
      navigate({ to: "/dashboard/products" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create shop");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="font-display text-2xl font-semibold">
            shop<span className="text-primary">link</span>
          </div>
          <h1 className="mt-6 text-3xl">Set up your shop</h1>
          <p className="mt-1 text-sm text-muted-foreground">Three quick things and you're live.</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <div>
            <Label htmlFor="bn">Business name</Label>
            <Input
              id="bn"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Ada's Skin Studio"
              required
              className="mt-1"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              your.shop/<span className="font-medium text-foreground">{slug || "your-name"}</span>
            </p>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setTouched(true);
                setSlug(slugify(e.target.value));
              }}
              className="mt-2 w-full rounded-md border border-input bg-card px-3 py-1.5 text-xs"
              placeholder="customize the link"
            />
          </div>

          <div>
            <Label htmlFor="wa">WhatsApp number</Label>
            <Input
              id="wa"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+234 801 234 5678"
              required
              className="mt-1"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Orders land in this chat. No new app to check.
            </p>
          </div>

          <div>
            <Label>
              Logo <span className="text-muted-foreground">(optional)</span>
            </Label>
            <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3 hover:bg-accent">
              {logoPreview ? (
                <img src={logoPreview} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Upload className="h-5 w-5" />
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                {logoFile ? logoFile.name : "Tap to upload"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full rounded-full" size="lg">
            {loading ? "Creating…" : "Create my shop link"}
          </Button>
        </form>
      </div>
    </div>
  );
}
