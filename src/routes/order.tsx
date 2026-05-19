import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Minus, Plus, Tag, Truck, CheckCircle2, Receipt, Sparkles, ShoppingBag, X, Check } from "lucide-react";
import { PRODUCTS, BUNDLES, SHIPPING_ZONES, PROMO_CODES, formatEGP, computeLineTotal, effectivePrice, type ProductSlug } from "@/data/products";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Place an Order — Smile Maker" },
      { name: "description", content: "Build your Smile Maker order." },
    ],
  }),
  component: OrderPage,
});

const orderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().regex(/^(\+?2)?0?1[0-9]{9}$/i),
  email: z.string().trim().email().max(255).or(z.literal("")),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(500).optional(),
});

type Quantities = Partial<Record<ProductSlug, number>>;
type Colors = Partial<Record<ProductSlug, string>>;

function OrderPage() {
  const { t, tl, lang } = useT();
  const [qty, setQty] = useState<Quantities>({});
  const [colors, setColors] = useState<Colors>({});
  const [zoneId, setZoneId] = useState(SHIPPING_ZONES[0].id);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<null | {
    id: string;
    when: string;
    items: { title: string; qty: number; lineTotal: number }[];
    subtotal: number;
    bundleDiscount: number;
    appliedBundles: string[];
    promoDiscount: number;
    promoCode?: string;
    shippingFee: number;
    shippingZone: string;
    total: number;
    name: string;
    phone: string;
    address: string;
    city: string;
  }>(null);

  const inc = (slug: ProductSlug) => setQty((q) => ({ ...q, [slug]: (q[slug] ?? 0) + 1 }));
  const dec = (slug: ProductSlug) => setQty((q) => ({ ...q, [slug]: Math.max(0, (q[slug] ?? 0) - 1) }));
  const set = (slug: ProductSlug, v: number) => setQty((q) => ({ ...q, [slug]: Math.max(0, Math.min(99, v || 0)) }));

  const lines = useMemo(
    () =>
      PRODUCTS.filter((p) => (qty[p.slug] ?? 0) > 0).map((p) => {
        const q = qty[p.slug]!;
        const colorId = colors[p.slug];
        const color = p.colors?.find((c) => c.id === colorId);
        return {
          slug: p.slug,
          title: p.title + (color ? ` — ${tl(color.label)}` : ""),
          qty: q,
          lineTotal: computeLineTotal(p, q),
        };
      }),
    [qty, colors, tl],
  );

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const matchedBundles = useMemo(
    () => BUNDLES.filter((b) => b.items.every((s) => (qty[s] ?? 0) >= 1)),
    [qty],
  );
  const bundleDiscount = useMemo(() => {
    return matchedBundles.reduce((sum, b) => {
      const bundlePrice = b.items
        .map((s) => effectivePrice(PRODUCTS.find((p) => p.slug === s)!))
        .reduce((a, c) => a + c, 0);
      return sum + Math.round((bundlePrice * b.discountPct) / 100);
    }, 0);
  }, [matchedBundles]);

  const promoDiscount = appliedPromo
    ? Math.round(((subtotal - bundleDiscount) * appliedPromo.pct) / 100)
    : 0;

  const shippingZone = SHIPPING_ZONES.find((z) => z.id === zoneId)!;
  const shippingFee = lines.length > 0 ? shippingZone.fee : 0;
  const total = Math.max(0, subtotal - bundleDiscount - promoDiscount) + shippingFee;

  const applyPromo = () => {
    setPromoError(null);
    const code = promo.trim().toUpperCase();
    if (!code) return setPromoError(t("order.enterPromo"));
    const found = PROMO_CODES.find((p) => p.code === code);
    if (!found) return setPromoError(t("order.invalidPromo"));
    setAppliedPromo({ code: found.code, pct: found.pct });
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromo("");
    setPromoError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      setErrors({ items: t("order.emptyError") });
      return;
    }
    const result = orderSchema.safeParse(form);
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.errors.forEach((er) => {
        if (er.path[0]) errs[String(er.path[0])] = er.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    const id = "SM-" + Date.now().toString(36).toUpperCase().slice(-7);
    setConfirmed({
      id,
      when: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }),
      items: lines.map((l) => ({ title: l.title, qty: l.qty, lineTotal: l.lineTotal })),
      subtotal,
      bundleDiscount,
      appliedBundles: matchedBundles.map((b) => tl(b.title)),
      promoDiscount,
      promoCode: appliedPromo?.code,
      shippingFee,
      shippingZone: tl(shippingZone.label),
      total,
      name: result.data.name,
      phone: result.data.phone,
      address: result.data.address,
      city: result.data.city,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setConfirmed(null);
    setQty({});
    setColors({});
    setForm({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
    setAppliedPromo(null);
    setPromo("");
  };

  if (confirmed) {
    return (
      <Layout>
        <section className="section-pad bg-soft">
          <div className="container-lux max-w-3xl">
            <div className="lux-card p-6 sm:p-8 md:p-12">
              <div className="text-center">
                <div className="inline-flex h-16 w-16 rounded-full bg-brand text-white items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="mt-5 text-3xl sm:text-4xl md:text-5xl font-display">{t("order.confirmed")}</h1>
                <p className="mt-3 text-muted-foreground text-sm sm:text-base">
                  {t("order.thankYou")} {confirmed.name.split(" ")[0]}{t("order.thankYouRest")}
                </p>
              </div>

              <div className="mt-8 sm:mt-10 rounded-2xl border border-dashed border-border bg-white p-4 sm:p-6 md:p-8">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-deep-blue" />
                    <span className="font-display text-xl">{t("order.receipt")}</span>
                  </div>
                  <div className="text-end text-xs text-muted-foreground">
                    <p>#<span className="font-medium text-ink">{confirmed.id}</span></p>
                    <p>{confirmed.when}</p>
                  </div>
                </div>

                <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("order.customer")}</p>
                    <p className="mt-1 text-ink">{confirmed.name}</p>
                    <p className="text-muted-foreground" dir="ltr">{confirmed.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("order.shippingTo")}</p>
                    <p className="mt-1 text-ink">{confirmed.city}</p>
                    <p className="text-muted-foreground break-words">{confirmed.address}</p>
                  </div>
                </div>

                <div className="mt-6 border-t border-dashed border-border pt-6 space-y-3">
                  {confirmed.items.map((it) => (
                    <div key={it.title} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink min-w-0 truncate">
                        <span dir="ltr">{it.title}</span> <span className="text-muted-foreground">× {it.qty}</span>
                      </span>
                      <span className="font-medium text-ink whitespace-nowrap">{formatEGP(it.lineTotal, lang)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-dashed border-border pt-6 space-y-2 text-sm">
                  <Row label={t("order.subtotal")} value={formatEGP(confirmed.subtotal, lang)} />
                  {confirmed.bundleDiscount > 0 && (
                    <Row
                      label={`${t("order.bundleDiscount")}${confirmed.appliedBundles.length ? ` (${confirmed.appliedBundles.join(", ")})` : ""}`}
                      value={`− ${formatEGP(confirmed.bundleDiscount, lang)}`}
                      accent
                    />
                  )}
                  {confirmed.promoDiscount > 0 && (
                    <Row label={`${t("order.promo")} (${confirmed.promoCode})`} value={`− ${formatEGP(confirmed.promoDiscount, lang)}`} accent />
                  )}
                  <Row label={`${t("order.shipping")} — ${confirmed.shippingZone}`} value={formatEGP(confirmed.shippingFee, lang)} />
                  <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                    <span className="font-display text-lg">{t("order.total")}</span>
                    <span className="font-display text-2xl text-gradient">{formatEGP(confirmed.total, lang)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <button onClick={reset} className="btn-primary">{t("order.placeAnother")}</button>
                <Link to="/products" className="btn-ghost">{t("order.backProducts")}</Link>
              </div>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12 sm:py-16 md:section-pad bg-soft relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-arc)" }} />
        <div className="container-lux relative text-center max-w-2xl mx-auto">
          <p className="eyebrow">{t("order.eyebrow")}</p>
          <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display leading-tight">
            {t("order.h1.a")} <span className="text-gradient">{t("order.h1.b")}</span>.
          </h1>
          <p className="mt-4 text-sm sm:text-base md:text-lg text-muted-foreground px-2">{t("order.lead")}</p>
        </div>
      </section>

      <section className="pt-10 pb-16 sm:pb-24">
        <div className="container-lux grid lg:grid-cols-5 gap-6 lg:gap-8">
          <div className="lg:col-span-3 space-y-6">

            {/* ── Bundles ── */}
            <div className="lux-card p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-deep-blue" />
                <h2 className="font-display text-2xl">{t("products.bundlesEyebrow")}</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5">{t("products.bundles.lead")}</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {BUNDLES.map((b) => {
                  const items = b.items.map((s) => PRODUCTS.find((p) => p.slug === s)!);
                  const total = items.reduce((sum, i) => sum + effectivePrice(i), 0);
                  const discounted = Math.round(total * (1 - b.discountPct / 100));
                  const isActive = b.items.every((s) => (qty[s] ?? 0) >= 1);
                  const toggleBundle = () => {
                    if (isActive) {
                      setQty((q) => {
                        const next = { ...q };
                        b.items.forEach((s) => { next[s] = 0; });
                        return next;
                      });
                    } else {
                      setQty((q) => {
                        const next = { ...q };
                        b.items.forEach((s) => { if ((next[s] ?? 0) < 1) next[s] = 1; });
                        return next;
                      });
                    }
                  };
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={toggleBundle}
                      className={`text-start rounded-2xl border-2 p-4 transition-all hover:shadow-md ${isActive ? "border-deep-blue bg-soft" : "border-border bg-white hover:border-turquoise"}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-deep-blue shrink-0" />
                        <span className="text-xs font-semibold text-deep-blue">{t("products.save")} {b.discountPct}%</span>
                      </div>
                      <p className="mt-2 font-display text-base leading-snug">{tl(b.title)}</p>
                      <div className="mt-3 flex gap-2">
                        {items.map((i) => (
                          <div key={i.slug} className="h-12 w-12 rounded-xl bg-soft border border-border flex items-center justify-center overflow-hidden">
                            <img src={i.image} alt={i.title} loading="lazy" width={96} height={96} className="w-3/4 h-3/4 object-contain" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-display text-lg text-gradient">{formatEGP(discounted, lang)}</span>
                          <span className="ms-1.5 text-xs text-muted-foreground line-through">{formatEGP(total, lang)}</span>
                        </div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <X className="h-3.5 w-3.5" /> {lang === "ar" ? "إزالة" : "Remove"}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-deep-blue">{lang === "ar" ? "+ أضف" : "+ Add"}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Individual products ── */}
            <div className="lux-card p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-deep-blue" />
                <h2 className="font-display text-2xl">{t("order.choose")}</h2>
              </div>
              {errors.items && <p className="mt-3 text-sm text-destructive">{errors.items}</p>}

              <div className="mt-5 divide-y divide-border">
                {PRODUCTS.map((p) => {
                  const q = qty[p.slug] ?? 0;
                  const selectedColor = colors[p.slug];
                  const price = effectivePrice(p);
                  const onSale = p.salePrice != null;
                  return (
                    <div key={p.slug} className="py-4">
                      {/* Top row: image + name + tagline */}
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-16 rounded-xl bg-soft border border-border flex items-center justify-center overflow-hidden shrink-0">
                          <img src={p.image} alt={p.title} loading="lazy" width={128} height={128} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink leading-snug" dir="ltr">{p.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tl(p.tagline)}</p>
                        </div>
                      </div>
                      {/* Bottom row: price + quantity control */}
                      <div className="mt-3 ms-[76px] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-display text-gradient">{formatEGP(price, lang)}</span>
                          {onSale && <span className="ms-2 text-[11px] text-muted-foreground line-through font-sans">{formatEGP(p.price, lang)}</span>}
                          {p.bulkDeal && <p className="text-[10px] text-deep-blue font-sans mt-0.5">{tl(p.bulkDeal.label)}</p>}
                        </div>
                        <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-1 shrink-0">
                          <button type="button" onClick={() => dec(p.slug)} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors" disabled={q === 0}>
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            inputMode="numeric"
                            value={q}
                            onChange={(e) => set(p.slug, parseInt(e.target.value.replace(/\D/g, ""), 10))}
                            className="w-10 text-center bg-transparent text-sm font-medium focus:outline-none"
                          />
                          <button type="button" onClick={() => inc(p.slug)} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {p.colors && q > 0 && (
                        <div className="mt-3 ms-[76px]">
                          <p className="text-xs text-muted-foreground mb-2">{t("order.color")}:</p>
                          <div className="flex flex-wrap gap-2">
                            {p.colors.map((c) => {
                              const active = selectedColor === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => setColors((cs) => ({ ...cs, [p.slug]: selectedColor === c.id ? undefined : c.id }))}
                                  className={`group flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-all ${active ? "border-deep-blue bg-soft" : "border-border bg-white hover:border-turquoise"}`}
                                  aria-pressed={active}
                                  aria-label={tl(c.label)}
                                >
                                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                                  <span className={active ? "text-ink font-medium" : "text-muted-foreground"}>{tl(c.label)}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {matchedBundles.length > 0 && (
                <div className="mt-4 rounded-xl bg-soft border border-border p-4 flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-deep-blue mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-ink">{t("order.bundleApplied")}</p>
                    <p className="text-muted-foreground">
                      {matchedBundles.map((b) => `${tl(b.title)} (−${b.discountPct}%)`).join(" · ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={submit} className="lux-card p-5 sm:p-6 md:p-8 space-y-5">
              <h2 className="font-display text-2xl">{t("order.delivery")}</h2>

              <Field label={t("order.fullName")} error={errors.name}>
                <input
                  id="full-name"
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={100}
                  placeholder={t("order.namePlaceholder")}
                  className="lux-input"
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-5">
                <Field label={t("order.phone")} error={errors.phone}>
                  <input
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01050852966"
                    dir="ltr"
                    className="lux-input"
                    maxLength={20}
                  />
                </Field>
                <Field label={t("order.emailOpt")} error={errors.email}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    className="lux-input"
                    maxLength={255}
                    dir="ltr"
                  />
                </Field>
              </div>

              <Field label={t("order.governorate")}>
                <select
                  id="governorate"
                  name="governorate"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="lux-input"
                >
                  {SHIPPING_ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {tl(z.label)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("order.city")} error={errors.city}>
                <input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder={t("order.cityPlaceholder")}
                  maxLength={100}
                  className="lux-input"
                />
              </Field>

              <Field label={t("order.address")} error={errors.address}>
                <input
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t("order.addressPlaceholder")}
                  maxLength={300}
                  className="lux-input"
                />
              </Field>

              <Field label={t("order.notes")}>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  maxLength={500}
                  placeholder={t("order.notesPlaceholder")}
                  className="lux-input resize-none"
                />
              </Field>

              {/* Mobile-only promo code — shown before submit on phones */}
              <div className="lg:hidden rounded-xl bg-soft border border-border p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-deep-blue" />
                  <span className="font-medium text-ink">{t("order.promo")}</span>
                </div>
                {appliedPromo ? (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white border border-border px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium text-ink" dir="ltr">{appliedPromo.code}</span>
                      <span className="ms-2 text-muted-foreground">{appliedPromo.pct}% {t("order.off")}</span>
                    </div>
                    <button type="button" onClick={removePromo} className="h-6 w-6 rounded-full hover:bg-soft flex items-center justify-center">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      id="promo"
                      name="promo"
                      autoComplete="off"
                      value={promo}
                      onChange={(e) => setPromo(e.target.value.toUpperCase())}
                      placeholder="SMILE10"
                      maxLength={20}
                      className="lux-input flex-1"
                      dir="ltr"
                    />
                    <button type="button" onClick={applyPromo} className="btn-ghost text-sm">{t("order.apply")}</button>
                  </div>
                )}
                {promoError && <p className="mt-2 text-xs text-destructive">{promoError}</p>}
              </div>

              <button className="btn-primary w-full justify-center text-sm sm:text-base" type="submit">
                {t("order.placeOrder")} — {formatEGP(total, lang)}
              </button>
            </form>
          </div>

          <aside className="lg:col-span-2 hidden lg:block">
            <div className="lux-card p-5 sm:p-6 md:p-8 lg:sticky lg:top-24 space-y-5">
              <h2 className="font-display text-2xl">{t("order.summary")}</h2>

              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("order.empty")}</p>
              ) : (
                <ul className="space-y-3">
                  {lines.map((l) => (
                    <li key={l.slug} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink min-w-0 truncate">
                        <span dir="ltr">{l.title}</span> <span className="text-muted-foreground">× {l.qty}</span>
                      </span>
                      <span className="font-medium text-ink whitespace-nowrap">{formatEGP(l.lineTotal, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-xl bg-soft border border-border p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Tag className="h-4 w-4 text-deep-blue" />
                  <span className="font-medium text-ink">{t("order.promo")}</span>
                </div>
                {appliedPromo ? (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white border border-border px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium text-ink" dir="ltr">{appliedPromo.code}</span>
                      <span className="ms-2 text-muted-foreground">{appliedPromo.pct}% {t("order.off")}</span>
                    </div>
                    <button type="button" onClick={removePromo} className="h-6 w-6 rounded-full hover:bg-soft flex items-center justify-center">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      id="promo"
                      name="promo"
                      autoComplete="off"
                      value={promo}
                      onChange={(e) => setPromo(e.target.value.toUpperCase())}
                      placeholder="SMILE10"
                      maxLength={20}
                      className="lux-input flex-1"
                      dir="ltr"
                    />
                    <button type="button" onClick={applyPromo} className="btn-ghost text-sm">{t("order.apply")}</button>
                  </div>
                )}
                {promoError && <p className="mt-2 text-xs text-destructive">{promoError}</p>}
              </div>

              <div className="space-y-2 text-sm">
                <Row label={t("order.subtotal")} value={formatEGP(subtotal, lang)} />
                {bundleDiscount > 0 && <Row label={t("order.bundleDiscount")} value={`− ${formatEGP(bundleDiscount, lang)}`} accent />}
                {promoDiscount > 0 && <Row label={`${t("order.promo")} ${appliedPromo?.code}`} value={`− ${formatEGP(promoDiscount, lang)}`} accent />}
                <Row label={<span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> {t("order.shipping")}</span>} value={formatEGP(shippingFee, lang)} />
                <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                  <span className="font-display text-lg">{t("order.total")}</span>
                  <span className="font-display text-2xl text-gradient">{formatEGP(total, lang)}</span>
                </div>
              </div>
            </div>
          </aside>
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
