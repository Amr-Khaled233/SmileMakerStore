import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Tag, Truck, CheckCircle2, Receipt, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { api } from "@/lib/api";
import { SHIPPING_ZONES, formatEGP } from "@/data/products";
import {
  useShopData,
  cartToLines,
  computeTotals,
  validateStock,
  buildOrderItems,
  type CartItem,
} from "@/lib/shop";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s.mode === "buynow" ? "buynow" : "cart" }) as { mode: "buynow" | "cart" },
  component: CheckoutPage,
});

const orderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(\+?2)?0?1[0-9]{9}$/i),
  email: z.string().trim().email().max(255).or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(500).optional(),
});

function CheckoutPage() {
  const { mode } = Route.useSearch();
  const { t, tl, lang } = useT();
  const nav = useNavigate();
  const cart = useCart();
  const data = useShopData();

  // Buy Now snapshot is read once (survives refresh via sessionStorage).
  const [buyNowItems] = useState<CartItem[]>(() => cart.getBuyNow());
  const sourceItems: CartItem[] = mode === "buynow" ? buyNowItems : cart.items;

  const [zoneId, setZoneId] = useState(SHIPPING_ZONES[0].id);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<null | { id: string; when: string; total: number; name: string }>(null);

  const lines = useMemo(() => (data.ready ? cartToLines(sourceItems, data, lang) : []), [sourceItems, data, lang]);
  const totals = useMemo(
    () => (data.ready ? computeTotals(sourceItems, data, { promoPct: appliedPromo?.pct, zoneId }) : { subtotal: 0, bundleDiscount: 0, promoDiscount: 0, shippingFee: 0, total: 0 }),
    [sourceItems, data, appliedPromo, zoneId],
  );

  const shippingZone = SHIPPING_ZONES.find((z) => z.id === zoneId)!;

  const applyPromo = () => {
    setPromoError(null);
    const code = promo.trim().toUpperCase();
    if (!code) return setPromoError(t("order.enterPromo"));
    const found = data.promoCodes.find((p) => p.code === code);
    if (!found) return setPromoError(t("order.invalidPromo"));
    setAppliedPromo({ code: found.code, pct: found.pct });
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sourceItems.length === 0) { setErrors({ items: t("order.emptyError") }); return; }

    const parsed = orderSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((er) => { if (er.path[0]) errs[String(er.path[0])] = er.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);

    // Re-validate against FRESH inventory right before creating the order.
    const freshInv = await api.getInventoryStatus().catch(() => data.inventory);
    const freshData = { ...data, inventory: freshInv };
    const stockErrs = validateStock(sourceItems, freshData, lang);
    if (stockErrs.length > 0) {
      setSubmitting(false);
      // Colour/stock problems belong on the cart (where they can be fixed).
      if (mode === "cart") { nav({ to: "/cart" }); return; }
      setStockErrors(stockErrs); // buy-now has no cart to return to
      return;
    }
    setStockErrors([]);

    const items = buildOrderItems(sourceItems, freshData, lang);
    const finalTotals = computeTotals(sourceItems, freshData, { promoPct: appliedPromo?.pct, zoneId });
    const id = "SM-" + Date.now().toString(36).toUpperCase().slice(-7);

    try {
      await api.createOrder({
        id,
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        zoneId,
        zoneLabel: tl(shippingZone.label),
        items,
        subtotal: finalTotals.subtotal,
        bundleDiscount: finalTotals.bundleDiscount,
        promoDiscount: finalTotals.promoDiscount,
        promoCode: appliedPromo?.code,
        shippingFee: finalTotals.shippingFee,
        total: finalTotals.total,
        notes: parsed.data.notes || undefined,
      });
    } catch {
      // Backend rejected (rate-limit / network). Surface a generic error.
      setStockErrors([lang === "ar" ? "حصل خطأ أثناء إرسال الطلب، حاول تاني." : "Something went wrong placing the order, please try again."]);
      setSubmitting(false);
      return;
    }

    // Success — clear the relevant source.
    if (mode === "buynow") cart.clearBuyNow();
    else cart.clear();

    setSubmitting(false);
    setConfirmed({
      id,
      when: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }),
      total: finalTotals.total,
      name: parsed.data.name,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Confirmation ──
  if (confirmed) {
    return (
      <Layout>
        <section className="section-pad bg-soft">
          <div className="container-lux max-w-2xl">
            <div className="lux-card p-8 md:p-12 text-center">
              <div className="inline-flex h-16 w-16 rounded-full bg-brand text-white items-center justify-center">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="mt-5 text-3xl sm:text-4xl font-display">{t("order.confirmed")}</h1>
              <p className="mt-3 text-muted-foreground">
                {t("order.thankYou")} {confirmed.name.split(" ")[0]}{t("order.thankYouRest")}
              </p>
              <div className="mt-8 rounded-2xl border border-dashed border-border bg-white p-6 inline-flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 text-deep-blue"><Receipt className="h-5 w-5" /><span className="font-display text-lg">{t("order.receipt")}</span></div>
                <p className="text-xs text-muted-foreground mt-1">#<span className="font-medium text-ink">{confirmed.id}</span> · {confirmed.when}</p>
                <p className="price-tag text-3xl text-gradient mt-2">{formatEGP(confirmed.total, lang)}</p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <Link to="/products" className="btn-primary">{t("order.backProducts")}</Link>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  if (!data.ready) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-deep-blue border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (sourceItems.length === 0) {
    return (
      <Layout>
        <section className="section-pad">
          <div className="container-lux max-w-xl text-center py-16">
            <h1 className="font-display text-3xl">{t("cart.empty")}</h1>
            <Link to="/products" className="btn-primary mt-6 inline-flex">{t("cart.emptyCta")}</Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="section-pad">
        <div className="container-lux">
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h1 className="font-display text-3xl sm:text-4xl">{t("checkout.title")}</h1>
            {mode === "cart" && <Link to="/cart" className="text-sm text-deep-blue hover:underline">← {t("checkout.backToCart")}</Link>}
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Form */}
            <form onSubmit={submit} className="lg:col-span-3 lux-card p-5 sm:p-8 space-y-5">
              <h2 className="font-display text-2xl">{t("order.delivery")}</h2>

              <Field label={t("order.fullName")} error={errors.name}>
                <input name="name" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} className="lux-input" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label={t("order.phone")} error={errors.phone}>
                  <input name="phone" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" className="lux-input" maxLength={20} />
                </Field>
                <Field label={t("order.emailOpt")} error={errors.email}>
                  <input name="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="lux-input" maxLength={255} dir="ltr" />
                </Field>
              </div>

              <Field label={t("order.governorate")}>
                <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="lux-input">
                  {SHIPPING_ZONES.map((z) => <option key={z.id} value={z.id}>{tl(z.label)}</option>)}
                </select>
              </Field>

              <Field label={t("order.city")} error={errors.city}>
                <input name="city" autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} className="lux-input" />
              </Field>

              <Field label={t("order.address")} error={errors.address}>
                <input name="address" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={300} className="lux-input" />
              </Field>

              <Field label={t("order.notes")}>
                <textarea name="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={500} className="lux-input resize-none" />
              </Field>

              {stockErrors.length > 0 && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-destructive">
                  <p className="font-medium mb-1">{t("checkout.fixErrors")}</p>
                  <ul className="list-disc ms-5 space-y-0.5">{stockErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}

              <button className="btn-primary w-full justify-center text-base disabled:opacity-60" type="submit" disabled={submitting}>
                {submitting ? (lang === "ar" ? "جاري الإرسال..." : "Sending...") : `${t("order.placeOrder")} — ${formatEGP(totals.total, lang)}`}
              </button>
            </form>

            {/* Summary */}
            <aside className="lg:col-span-2">
              <div className="lux-card p-5 sm:p-6 lg:sticky lg:top-24 space-y-5">
                <h2 className="font-display text-2xl">{t("order.summary")}</h2>

                <ul className="space-y-3">
                  {lines.map((l) => (
                    <li key={`${l.slug}-${l.colorId ?? ""}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink min-w-0 truncate"><span dir="ltr">{l.title}</span> <span className="text-muted-foreground">× {l.qty}</span></span>
                      <span className="font-medium text-ink whitespace-nowrap">{formatEGP(l.lineTotal, lang)}</span>
                    </li>
                  ))}
                </ul>

                {/* Promo */}
                <div className="rounded-xl bg-soft border border-border p-4">
                  <div className="flex items-center gap-2 text-sm"><Tag className="h-4 w-4 text-deep-blue" /><span className="font-medium text-ink">{t("order.promo")}</span></div>
                  {appliedPromo ? (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-white border border-border px-3 py-2">
                      <div className="text-sm"><span className="font-medium text-ink" dir="ltr">{appliedPromo.code}</span><span className="ms-2 text-muted-foreground">{appliedPromo.pct}% {t("order.off")}</span></div>
                      <button type="button" onClick={() => { setAppliedPromo(null); setPromo(""); }} className="h-6 w-6 rounded-full hover:bg-soft flex items-center justify-center"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="SMILE10" maxLength={20} className="lux-input flex-1" dir="ltr" />
                      <button type="button" onClick={applyPromo} className="btn-ghost text-sm">{t("order.apply")}</button>
                    </div>
                  )}
                  {promoError && <p className="mt-2 text-xs text-destructive">{promoError}</p>}
                </div>

                <div className="space-y-2 text-sm">
                  <Row label={t("order.subtotal")} value={formatEGP(totals.subtotal, lang)} />
                  {totals.bundleDiscount > 0 && <Row label={t("order.bundleDiscount")} value={`− ${formatEGP(totals.bundleDiscount, lang)}`} accent />}
                  {totals.promoDiscount > 0 && <Row label={`${t("order.promo")} ${appliedPromo?.code ?? ""}`} value={`− ${formatEGP(totals.promoDiscount, lang)}`} accent />}
                  <Row
                    label={<span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> {t("order.shipping")}</span>}
                    value={data.freeShippingActive && lines.length > 0 ? <span className="text-deep-blue font-semibold">{lang === "ar" ? "مجاني 🎉" : "Free 🎉"}</span> : formatEGP(totals.shippingFee, lang)}
                  />
                  <div className="border-t border-border pt-3 mt-1 flex items-center justify-between">
                    <span className="font-display text-lg">{t("order.total")}</span>
                    <span className="price-tag text-2xl text-gradient">{formatEGP(totals.total, lang)}</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Row({ label, value, accent }: { label: React.ReactNode; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`whitespace-nowrap ${accent ? "text-deep-blue font-medium" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
