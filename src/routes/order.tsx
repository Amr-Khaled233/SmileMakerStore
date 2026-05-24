import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { Minus, Plus, Tag, Truck, CheckCircle2, Receipt, Sparkles, ShoppingBag, X, Check } from "lucide-react";
import { PRODUCTS, BUNDLES, SHIPPING_ZONES, PROMO_CODES, formatEGP, computeLineTotal, effectivePrice, type ProductSlug, type Product } from "@/data/products";
import { useT } from "@/lib/i18n";
import { api, type PublicInventoryStatus, type Pricing } from "@/lib/api";

export const Route = createFileRoute("/order")({
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
type ColorQtyMap = Partial<Record<ProductSlug, Record<string, number>>>;

function OrderPage() {
  const { t, tl, lang } = useT();
  const [qty, setQty] = useState<Quantities>({});
  const [colorQty, setColorQty] = useState<ColorQtyMap>({});
  const [zoneId, setZoneId] = useState(SHIPPING_ZONES[0].id);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<PublicInventoryStatus>({ outOfStock: [], outOfStockColors: {} });
  const [pricing, setPricing] = useState<Pricing>({ products: [], bundles: [], promoCodes: [] });
  const [freeShippingActive, setFreeShippingActive] = useState(false);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);

  useEffect(() => { api.getInventoryStatus().then(setInventoryStatus).catch(() => {}); }, []);
  useEffect(() => { api.getPricingPublic().then(setPricing).catch(() => {}); }, []);
  useEffect(() => { api.getFreeShippingStatus().then((r) => setFreeShippingActive(r.active)).catch(() => {}); }, []);

  // Merge static product data with live inventory status and pricing overrides
  const products = useMemo(
    () =>
      PRODUCTS.map((p) => {
        const priceOv = pricing.products.find((x) => x.slug === p.slug);
        return {
          ...p,
          price: priceOv?.price ?? p.price,
          salePrice: priceOv !== undefined ? (priceOv.salePrice ?? undefined) : p.salePrice,
          outOfStock: inventoryStatus.outOfStock.includes(p.slug) ? true : p.outOfStock,
          outOfStockColors: inventoryStatus.outOfStockColors[p.slug] ?? p.outOfStockColors,
        };
      }),
    [inventoryStatus, pricing],
  );

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
  const incColor = (slug: ProductSlug, colorId: string) =>
    setColorQty((m) => ({ ...m, [slug]: { ...(m[slug] ?? {}), [colorId]: (m[slug]?.[colorId] ?? 0) + 1 } }));
  const decColor = (slug: ProductSlug, colorId: string) =>
    setColorQty((m) => ({ ...m, [slug]: { ...(m[slug] ?? {}), [colorId]: Math.max(0, (m[slug]?.[colorId] ?? 0) - 1) } }));
  const totalColorQty = (slug: ProductSlug) =>
    Object.values(colorQty[slug] ?? {}).reduce((s, q) => s + q, 0);

  const lines = useMemo(() => {
    const result: { slug: string; colorId?: string; title: string; qty: number; lineTotal: number }[] = [];
    for (const p of products) {
      if (p.colors?.length) {
        for (const [colorId, q] of Object.entries(colorQty[p.slug] ?? {})) {
          if (q > 0) {
            const color = p.colors.find((c) => c.id === colorId);
            result.push({ slug: p.slug, colorId, title: p.title + (color ? ` — ${tl(color.label)}` : ""), qty: q, lineTotal: computeLineTotal(p, q) });
          }
        }
      } else {
        const q = qty[p.slug] ?? 0;
        if (q > 0) result.push({ slug: p.slug, title: p.title, qty: q, lineTotal: computeLineTotal(p, q) });
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, colorQty, tl, products]);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const dynamicBundles = useMemo(
    () =>
      BUNDLES.map((b) => {
        const ov = pricing.bundles.find((x) => x.id === b.id);
        return { ...b, fixedPrice: ov?.price };
      }),
    [pricing],
  );
  const dynamicPromoCodes = useMemo(
    (): Array<{ code: string; pct: number }> =>
      pricing.promoCodes.length > 0
        ? pricing.promoCodes
        : PROMO_CODES.map((p) => ({ code: p.code, pct: p.pct })),
    [pricing],
  );
  const slugQty = (s: string) => {
    const p = products.find((x) => x.slug === s);
    return p?.colors?.length ? totalColorQty(p.slug) : (qty[s as ProductSlug] ?? 0);
  };
  const matchedBundles = useMemo(
    () => dynamicBundles.filter(
      (b) =>
        selectedBundleIds.includes(b.id) &&
        b.items.every((s) => slugQty(s) >= 1 && !products.find((p) => p.slug === s)?.outOfStock),
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qty, colorQty, selectedBundleIds, products, dynamicBundles],
  );
  const bundleDiscount = useMemo(() => {
    return matchedBundles.reduce((sum, b) => {
      const itemsSum = b.items
        .map((s) => effectivePrice(products.find((p) => p.slug === s)!))
        .reduce((a, c) => a + c, 0);
      const discount =
        b.fixedPrice !== undefined
          ? Math.max(0, itemsSum - b.fixedPrice)
          : Math.round((itemsSum * b.discountPct) / 100);
      return sum + discount;
    }, 0);
  }, [matchedBundles, products]);

  const promoDiscount = appliedPromo
    ? Math.round(((subtotal - bundleDiscount) * appliedPromo.pct) / 100)
    : 0;

  const shippingZone = SHIPPING_ZONES.find((z) => z.id === zoneId)!;
  const shippingFee = lines.length > 0 && !freeShippingActive ? shippingZone.fee : 0;
  const total = Math.max(0, subtotal - bundleDiscount - promoDiscount) + shippingFee;

  const applyPromo = () => {
    setPromoError(null);
    const code = promo.trim().toUpperCase();
    if (!code) return setPromoError(t("order.enterPromo"));
    const found = dynamicPromoCodes.find((p) => p.code === code);
    if (!found) return setPromoError(t("order.invalidPromo"));
    setAppliedPromo({ code: found.code, pct: found.pct });
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromo("");
    setPromoError(null);
  };

  const submit = async (e: React.FormEvent) => {
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
    setSubmitting(true);
    const id = "SM-" + Date.now().toString(36).toUpperCase().slice(-7);

    // Save to backend (fail silently — confirmation still shows)
    try {
      await api.createOrder({
        id,
        name: result.data.name,
        phone: result.data.phone,
        address: result.data.address,
        city: result.data.city,
        zoneId,
        zoneLabel: tl(shippingZone.label),
        items: lines.map((l) => ({ slug: l.slug, colorId: l.colorId, title: l.title, qty: l.qty, lineTotal: l.lineTotal })),
        subtotal,
        bundleDiscount,
        promoDiscount,
        promoCode: appliedPromo?.code,
        shippingFee,
        total,
        notes: result.data.notes || undefined,
      });
    } catch {
      // backend not running — still show confirmation
    }

    setSubmitting(false);
    setConfirmed({
      id,
      when: new Date().toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }),
      items: lines.map((l) => ({ slug: l.slug, colorId: l.colorId, title: l.title, qty: l.qty, lineTotal: l.lineTotal })),
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
    setColorQty({});
    setSelectedBundleIds([]);
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
                {dynamicBundles.map((b) => {
                  const items = b.items.map((s) => products.find((p) => p.slug === s)!);
                  const total = items.reduce((sum, i) => sum + effectivePrice(i), 0);
                  const discounted = b.fixedPrice ?? Math.round(total * (1 - b.discountPct / 100));
                  const savingsPct = total > 0 ? Math.round(((total - discounted) / total) * 100) : 0;
                  const bundleOos = b.items.some((s) => products.find((p) => p.slug === s)?.outOfStock === true);
                  const isActive = !bundleOos && selectedBundleIds.includes(b.id) && b.items.every((s) => slugQty(s) >= 1);
                  const toggleBundle = () => {
                    if (bundleOos) return;
                    if (isActive) {
                      setSelectedBundleIds((ids) => ids.filter((id) => id !== b.id));
                      setQty((q) => { const next = { ...q }; b.items.forEach((s) => { next[s as ProductSlug] = 0; }); return next; });
                      setColorQty((m) => { const next = { ...m }; b.items.forEach((s) => { next[s as ProductSlug] = {}; }); return next; });
                    } else {
                      setSelectedBundleIds((ids) => ids.includes(b.id) ? ids : [...ids, b.id]);
                      setQty((q) => {
                        const next = { ...q };
                        b.items.forEach((s) => {
                          const p = products.find((x) => x.slug === s);
                          if (!p?.colors?.length && (next[s as ProductSlug] ?? 0) < 1) next[s as ProductSlug] = 1;
                        });
                        return next;
                      });
                      setColorQty((m) => {
                        const next = { ...m };
                        b.items.forEach((s) => {
                          const p = products.find((x) => x.slug === s);
                          if (p?.colors?.length) {
                            const alreadyHas = Object.values(next[s as ProductSlug] ?? {}).reduce((a, c) => a + c, 0) >= 1;
                            if (!alreadyHas) {
                              const first = p.colors.find((c) => !p.outOfStockColors?.includes(c.id));
                              if (first) next[s as ProductSlug] = { ...(next[s as ProductSlug] ?? {}), [first.id]: 1 };
                            }
                          }
                        });
                        return next;
                      });
                    }
                  };
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={toggleBundle}
                      disabled={bundleOos}
                      className={`text-start rounded-2xl border-2 p-4 transition-all ${bundleOos ? "opacity-55 cursor-not-allowed border-border bg-white" : isActive ? "border-deep-blue bg-soft hover:shadow-md" : "border-border bg-white hover:border-turquoise hover:shadow-md"}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-display text-base leading-snug">{tl(b.title)}</p>
                        {bundleOos && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                            {lang === "ar" ? "نفد المخزون" : "Out of stock"}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex gap-2">
                        {items.map((i) => (
                          <div key={i.slug} className={`h-12 w-12 rounded-xl bg-soft border border-border flex items-center justify-center overflow-hidden ${i.outOfStock ? "grayscale" : ""}`}>
                            <img src={i.image} alt={i.title} loading="lazy" width={96} height={96} className="w-3/4 h-3/4 object-contain" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">
                            <span className="line-through">{formatEGP(total, lang)}</span>
                            {savingsPct > 0 && !bundleOos && (
                              <span className="ms-1.5 text-xs font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5">−{savingsPct}%</span>
                            )}
                          </p>
                          <span className={`price-tag text-lg ${bundleOos ? "text-muted-foreground" : "text-gradient"}`}>{formatEGP(discounted, lang)}</span>
                        </div>
                        {bundleOos ? null : isActive ? (
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
                {products.map((p) => {
                  const hasColors = (p.colors?.length ?? 0) > 0;
                  const q = hasColors ? totalColorQty(p.slug) : (qty[p.slug] ?? 0);
                  const price = effectivePrice(p);
                  const onSale = p.salePrice != null;
                  const oos = p.outOfStock === true;
                  return (
                    <div key={p.slug} className={`py-4 transition-opacity ${oos ? "opacity-55" : ""}`}>
                      {/* Top row: image + name + tagline + price */}
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-16 rounded-xl bg-soft border border-border flex items-center justify-center overflow-hidden shrink-0">
                          <img src={p.image} alt={p.title} loading="lazy" width={128} height={128} className={`w-full h-full object-cover ${oos ? "grayscale" : ""}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium text-ink leading-snug ${oos ? "line-through decoration-muted-foreground/50" : ""}`} dir="ltr">{p.title}</p>
                            {oos && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
                                {lang === "ar" ? "نفد المخزون" : "Out of stock"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tl(p.tagline)}</p>
                          <div className="mt-1">
                            <span className="text-sm price-tag text-gradient">{formatEGP(price, lang)}</span>
                            {onSale && <span className="ms-2 text-[11px] text-muted-foreground line-through font-sans">{formatEGP(p.price, lang)}</span>}
                            {p.bulkDeal && <p className="text-[10px] text-deep-blue font-sans mt-0.5">{tl(p.bulkDeal.label)}</p>}
                          </div>
                        </div>
                        {/* Qty stepper — only for non-color products */}
                        {!hasColors && (
                          <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-1 shrink-0">
                            <button type="button" onClick={() => dec(p.slug)} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors" disabled={q === 0 || oos}>
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              inputMode="numeric"
                              value={q}
                              readOnly={oos}
                              onChange={(e) => !oos && set(p.slug, parseInt(e.target.value.replace(/\D/g, ""), 10))}
                              className="w-10 text-center bg-transparent text-sm font-medium focus:outline-none"
                            />
                            <button type="button" onClick={() => inc(p.slug)} disabled={oos} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Per-color steppers */}
                      {hasColors && !oos && (
                        <div className="mt-3 ms-[76px] space-y-2">
                          {p.colors!.map((c) => {
                            const colorOos = p.outOfStockColors?.includes(c.id) === true;
                            const cq = colorQty[p.slug]?.[c.id] ?? 0;
                            return (
                              <div key={c.id} className={`flex items-center justify-between gap-3 ${colorOos ? "opacity-45" : ""}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="relative h-4 w-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }}>
                                    {colorOos && <span className="absolute inset-0 flex items-center justify-center"><span className="absolute w-[130%] h-px bg-muted-foreground/60 rotate-45 origin-center" /></span>}
                                  </span>
                                  <span className={`text-xs ${colorOos ? "text-muted-foreground line-through" : "text-ink"}`}>{tl(c.label)}</span>
                                  {colorOos && <span className="text-[10px] text-muted-foreground">({lang === "ar" ? "نفد" : "OOS"})</span>}
                                </div>
                                <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-0.5 shrink-0">
                                  <button type="button" onClick={() => decColor(p.slug, c.id)} disabled={cq === 0 || colorOos} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors">
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-7 text-center text-sm font-medium">{cq}</span>
                                  <button type="button" onClick={() => incColor(p.slug, c.id)} disabled={colorOos} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {q > 0 && (
                            <p className="text-xs text-muted-foreground pt-1">
                              {lang === "ar" ? `المجموع: ${q} قطعة` : `Total: ${q} item${q !== 1 ? "s" : ""}`}
                              {" · "}{formatEGP(price * q, lang)}
                            </p>
                          )}
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
                      {matchedBundles.map((b) => tl(b.title)).join(" · ")}
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

              <button
                className="btn-primary w-full justify-center text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                type="submit"
                disabled={submitting}
              >
                {submitting
                  ? lang === "ar" ? "جاري الإرسال..." : "Sending..."
                  : `${t("order.placeOrder")} — ${formatEGP(total, lang)}`}
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
                <Row
                  label={<span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> {t("order.shipping")}</span>}
                  value={
                    freeShippingActive && lines.length > 0
                      ? <span className="text-deep-blue font-semibold">{lang === "ar" ? "مجاني 🎉" : "Free 🎉"}</span>
                      : formatEGP(shippingFee, lang)
                  }
                />
                <div className="border-t border-border pt-3 mt-3 flex items-center justify-between">
                  <span className="font-display text-lg">{t("order.total")}</span>
                  <span className="price-tag text-2xl text-gradient">{formatEGP(total, lang)}</span>
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
