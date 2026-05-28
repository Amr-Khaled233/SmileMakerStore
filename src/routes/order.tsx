import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { Minus, Plus, Tag, Truck, CheckCircle2, Receipt, Sparkles, ShoppingBag, X, Check } from "lucide-react";
import { PRODUCTS, BUNDLES, SHIPPING_ZONES, formatEGP, computeLineTotal, effectivePrice, type ProductSlug } from "@/data/products";
import { useT } from "@/lib/i18n";
import { api, type PublicInventoryStatus, type Pricing, type DynamicProduct, type DynamicBundle, type BundleOverride } from "@/lib/api";

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

// Unified shape for bundle/line resolution (works for static and dynamic products)
type DisplayProduct = {
  slug: string;
  title: string;
  tagline: { en: string; ar: string };
  image: string;
  price: number;
  salePrice?: number;
  outOfStock: boolean;
  outOfStockColors?: string[];
  colors?: { id: string; label: { en: string; ar: string }; hex: string }[];
};

function OrderPage() {
  const { t, tl, lang } = useT();
  const [standaloneQty, setStandaloneQty] = useState<Quantities>({});
  const [standaloneColorQty, setStandaloneColorQty] = useState<ColorQtyMap>({});
  const [dynQty, setDynQty] = useState<Record<string, number>>({});
  const [dynColorQty, setDynColorQty] = useState<Record<string, Record<string, number>>>({});
  const [zoneId, setZoneId] = useState(SHIPPING_ZONES[0].id);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; pct: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<PublicInventoryStatus>({ outOfStock: [], outOfStockColors: {}, colorQty: {} });
  const [pricing, setPricing] = useState<Pricing>({ products: [], bundles: [], promoCodes: [] });
  const [freeShippingActive, setFreeShippingActive] = useState(false);
  const [bundleQty, setBundleQty] = useState<Record<string, number>>({});
  const [bundleColorSelections, setBundleColorSelections] = useState<Record<string, Record<string, string>[]>>({});
  const [colorErrorBundles, setColorErrorBundles] = useState<Set<string>>(new Set());
  const bundleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [dynamicProducts, setDynamicProducts] = useState<DynamicProduct[]>([]);
  const [userCreatedBundles, setUserCreatedBundles] = useState<DynamicBundle[]>([]);
  const [bundleOverrides, setBundleOverrides] = useState<Record<string, BundleOverride>>({});
  const [staticColorOverrides, setStaticColorOverrides] = useState<Record<string, { id: string; label: { en: string; ar: string }; hex: string }[]>>({});

  useEffect(() => { api.getInventoryStatus().then(setInventoryStatus).catch(() => {}); }, []);
  useEffect(() => { api.getPricingPublic().then(setPricing).catch(() => {}); }, []);
  useEffect(() => { api.getFreeShippingStatus().then((r) => setFreeShippingActive(r.active)).catch(() => {}); }, []);
  useEffect(() => { api.getDynamicProducts().then(setDynamicProducts).catch(() => {}); }, []);
  useEffect(() => { api.getDynamicBundles().then(setUserCreatedBundles).catch(() => {}); }, []);
  const [staticImageOverrides, setStaticImageOverrides] = useState<Record<string, string[]>>({});
  useEffect(() => {
    api.getProductsMeta().then((m) => {
      setBundleOverrides(m.bundleOverrides);
      setStaticImageOverrides(m.imageOverrides ?? {});
      const colorOvs: Record<string, { id: string; label: { en: string; ar: string }; hex: string }[]> = {};
      for (const [slug, ov] of Object.entries(m.staticOverrides ?? {})) {
        if (ov.colors?.length) colorOvs[slug] = ov.colors;
      }
      setStaticColorOverrides(colorOvs);
    }).catch(() => {});
  }, []);

  // Merge static product data with live inventory status, pricing overrides, and color overrides
  const products = useMemo(
    () =>
      PRODUCTS.map((p) => {
        const priceOv = pricing.products.find((x) => x.slug === p.slug);
        const colorOv = staticColorOverrides[p.slug];
        const imgOv = staticImageOverrides[p.slug];
        return {
          ...p,
          price: priceOv?.price ?? p.price,
          salePrice: priceOv !== undefined ? (priceOv.salePrice ?? undefined) : p.salePrice,
          outOfStock: inventoryStatus.outOfStock.includes(p.slug) ? true : p.outOfStock,
          outOfStockColors: inventoryStatus.outOfStockColors[p.slug] ?? p.outOfStockColors,
          colors: colorOv ?? p.colors,
          image: imgOv?.[0] ?? p.image,
        };
      }),
    [inventoryStatus, pricing, staticColorOverrides, staticImageOverrides],
  );

  // Unified display list for bundle resolution (static + dynamic)
  const allDisplayProducts = useMemo<DisplayProduct[]>(
    () => [
      ...products.map((p) => ({
        slug: p.slug,
        title: p.title,
        tagline: p.tagline as { en: string; ar: string },
        image: staticImageOverrides[p.slug]?.[0] ?? p.image,
        price: p.price,
        salePrice: p.salePrice,
        outOfStock: p.outOfStock ?? false,
        outOfStockColors: p.outOfStockColors,
        colors: p.colors,
      })),
      ...dynamicProducts.map((p) => ({
        slug: p.slug,
        title: p.title,
        tagline: { en: p.description || p.title, ar: p.descriptionAr || p.titleAr },
        image: p.images[0] ?? "",
        price: p.price,
        salePrice: p.salePrice,
        outOfStock: p.outOfStock ?? false,
        outOfStockColors: undefined,
        colors: p.colors,
      })),
    ],
    [products, dynamicProducts, staticImageOverrides],
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

  const inc = (slug: ProductSlug) => setStandaloneQty((q) => ({ ...q, [slug]: (q[slug] ?? 0) + 1 }));
  const dec = (slug: ProductSlug) => setStandaloneQty((q) => ({ ...q, [slug]: Math.max(0, (q[slug] ?? 0) - 1) }));
  const set = (slug: ProductSlug, v: number) => setStandaloneQty((q) => ({ ...q, [slug]: Math.max(0, Math.min(99, v || 0)) }));
  const incColor = (slug: ProductSlug, colorId: string) =>
    setStandaloneColorQty((m) => ({ ...m, [slug]: { ...(m[slug] ?? {}), [colorId]: (m[slug]?.[colorId] ?? 0) + 1 } }));
  const decColor = (slug: ProductSlug, colorId: string) =>
    setStandaloneColorQty((m) => ({ ...m, [slug]: { ...(m[slug] ?? {}), [colorId]: Math.max(0, (m[slug]?.[colorId] ?? 0) - 1) } }));
  const standaloneColorTotal = (slug: ProductSlug) =>
    Object.values(standaloneColorQty[slug] ?? {}).reduce((s, q) => s + q, 0);

  // Dynamic product qty handlers
  const incDyn = (slug: string) => setDynQty((q) => ({ ...q, [slug]: (q[slug] ?? 0) + 1 }));
  const decDyn = (slug: string) => setDynQty((q) => ({ ...q, [slug]: Math.max(0, (q[slug] ?? 0) - 1) }));
  const incDynColor = (slug: string, colorId: string) =>
    setDynColorQty((m) => ({ ...m, [slug]: { ...(m[slug] ?? {}), [colorId]: (m[slug]?.[colorId] ?? 0) + 1 } }));
  const decDynColor = (slug: string, colorId: string) =>
    setDynColorQty((m) => ({ ...m, [slug]: { ...(m[slug] ?? {}), [colorId]: Math.max(0, (m[slug]?.[colorId] ?? 0) - 1) } }));
  const dynColorTotal = (slug: string) => Object.values(dynColorQty[slug] ?? {}).reduce((s, q) => s + q, 0);

  const dynamicBundles = useMemo(
    () => [
      ...BUNDLES.map((b) => {
        const priceOv = pricing.bundles.find((x) => x.id === b.id);
        const configOv = bundleOverrides[b.id];
        return {
          id: b.id,
          title: { en: configOv?.titleEn || b.title.en, ar: configOv?.titleAr || b.title.ar },
          tagline: { en: configOv?.taglineEn || b.tagline.en, ar: configOv?.taglineAr || b.tagline.ar },
          items: configOv?.items ?? b.items,
          discountPct: configOv?.discountPct ?? b.discountPct,
          fixedPrice: priceOv?.price,
        };
      }),
      ...userCreatedBundles.map((b) => ({
        id: b.id,
        title: { en: b.titleEn, ar: b.titleAr },
        tagline: { en: b.taglineEn ?? "", ar: b.taglineAr ?? "" },
        items: b.items,
        discountPct: 0,
        fixedPrice: b.price,
      })),
    ],
    [pricing, bundleOverrides, userCreatedBundles],
  );
  const dynamicPromoCodes = useMemo(
    (): Array<{ code: string; pct: number }> => pricing.promoCodes,
    [pricing],
  );

  // Matched bundles: explicitly selected + none of the items are OOS
  const matchedBundles = useMemo(
    () => dynamicBundles.filter(
      (b) =>
        (bundleQty[b.id] ?? 0) > 0 &&
        b.items.every((s) => !allDisplayProducts.find((p) => p.slug === s)?.outOfStock),
    ),
    [bundleQty, allDisplayProducts, dynamicBundles],
  );

  // Lines = bundle item contributions + standalone static + standalone dynamic
  const lines = useMemo(() => {
    type Line = { slug: string; colorId?: string; title: string; qty: number; lineTotal: number };
    const acc = new Map<string, Line>();
    const add = (key: string, entry: Line) => {
      const ex = acc.get(key);
      acc.set(key, ex ? { ...ex, qty: ex.qty + entry.qty, lineTotal: ex.lineTotal + entry.lineTotal } : entry);
    };

    // Bundle items (static or dynamic product slugs)
    for (const b of matchedBundles) {
      const bQty = bundleQty[b.id] ?? 1;
      for (let i = 0; i < bQty; i++) {
        for (const slug of b.items) {
          const p = allDisplayProducts.find((x) => x.slug === slug);
          if (!p) continue;
          const selectedColorId = p.colors?.length ? bundleColorSelections[b.id]?.[i]?.[slug] : undefined;
          const color = selectedColorId ? p.colors?.find((c) => c.id === selectedColorId) : undefined;
          const key = selectedColorId ? `${slug}__${selectedColorId}` : slug;
          add(key, { slug, colorId: selectedColorId, title: p.title + (color ? ` — ${tl(color.label)}` : ""), qty: 1, lineTotal: p.salePrice ?? p.price });
        }
      }
    }

    // Static standalone items
    for (const p of products) {
      if (p.colors?.length) {
        for (const [colorId, q] of Object.entries(standaloneColorQty[p.slug] ?? {})) {
          if (q > 0) {
            const color = p.colors.find((c) => c.id === colorId);
            add(`${p.slug}__${colorId}`, { slug: p.slug, colorId, title: p.title + (color ? ` — ${tl(color.label)}` : ""), qty: q, lineTotal: computeLineTotal(p, q) });
          }
        }
      } else {
        const q = standaloneQty[p.slug] ?? 0;
        if (q > 0) add(p.slug, { slug: p.slug, title: p.title, qty: q, lineTotal: computeLineTotal(p, q) });
      }
    }

    // Dynamic standalone items
    for (const p of dynamicProducts) {
      if (p.outOfStock) continue;
      const unitPrice = p.salePrice ?? p.price;
      if (p.colors?.length) {
        for (const [colorId, q] of Object.entries(dynColorQty[p.slug] ?? {})) {
          if (q > 0) {
            const color = p.colors.find((c) => c.id === colorId);
            add(`${p.slug}__${colorId}`, { slug: p.slug, colorId, title: p.title + (color ? ` — ${tl(color.label)}` : ""), qty: q, lineTotal: unitPrice * q });
          }
        }
      } else {
        const q = dynQty[p.slug] ?? 0;
        if (q > 0) add(p.slug, { slug: p.slug, title: p.title, qty: q, lineTotal: unitPrice * q });
      }
    }

    return Array.from(acc.values()).filter((l) => l.qty > 0);
  }, [matchedBundles, bundleColorSelections, standaloneQty, standaloneColorQty, dynQty, dynColorQty, tl, products, dynamicProducts, allDisplayProducts, bundleQty]);

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  // Returns how many of colorId for slug are consumed by instances BEFORE instanceIdx
  // (within the same bundle) + all instances of other matched bundles + standalone qty.
  const colorConsumedBefore = useCallback(
    (slug: string, colorId: string, bundleId: string, instanceIdx: number): number => {
      let count = (standaloneColorQty[slug as ProductSlug]?.[colorId] ?? 0) + (dynColorQty[slug]?.[colorId] ?? 0);
      for (const mb of matchedBundles) {
        const limit = mb.id === bundleId ? instanceIdx : (bundleQty[mb.id] ?? 1);
        for (let j = 0; j < limit; j++) {
          if (bundleColorSelections[mb.id]?.[j]?.[slug] === colorId) count++;
        }
      }
      return count;
    },
    [matchedBundles, bundleQty, bundleColorSelections, standaloneColorQty, dynColorQty],
  );

  const isColorVirtuallyOos = useCallback(
    (slug: string, colorId: string, bundleId: string, instanceIdx: number): boolean => {
      const available = inventoryStatus.colorQty?.[slug]?.[colorId];
      if (available === undefined) return false;
      return colorConsumedBefore(slug, colorId, bundleId, instanceIdx) >= available;
    },
    [inventoryStatus, colorConsumedBefore],
  );

  // True when the user's cart already holds all available units of this color
  const isColorMaxed = useCallback(
    (slug: string, colorId: string): boolean => {
      const available = inventoryStatus.colorQty?.[slug]?.[colorId];
      if (available === undefined) return false;
      let consumed = (standaloneColorQty[slug as ProductSlug]?.[colorId] ?? 0) + (dynColorQty[slug]?.[colorId] ?? 0);
      for (const mb of matchedBundles) {
        const bQty = bundleQty[mb.id] ?? 1;
        for (let j = 0; j < bQty; j++) {
          if (bundleColorSelections[mb.id]?.[j]?.[slug] === colorId) consumed++;
        }
      }
      return consumed >= available;
    },
    [inventoryStatus, standaloneColorQty, dynColorQty, matchedBundles, bundleQty, bundleColorSelections],
  );

  const bundleDiscount = useMemo(() => {
    return matchedBundles.reduce((sum, b) => {
      const bQty = bundleQty[b.id] ?? 1;
      const itemsSum = b.items
        .map((s) => { const p = allDisplayProducts.find((x) => x.slug === s); return p ? (p.salePrice ?? p.price) : 0; })
        .reduce((a, c) => a + c, 0);
      const discount =
        b.fixedPrice !== undefined
          ? Math.max(0, itemsSum - b.fixedPrice)
          : Math.round((itemsSum * b.discountPct) / 100);
      return sum + discount * bQty;
    }, 0);
  }, [matchedBundles, allDisplayProducts, bundleQty]);

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

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lines.length === 0) {
      setErrors({ items: t("order.emptyError") });
      return;
    }
    // Validate bundle color selections — every instance must have all colors chosen
    const missingColorIds = new Set<string>();
    for (const b of matchedBundles) {
      const bQty = bundleQty[b.id] ?? 1;
      for (let i = 0; i < bQty; i++) {
        for (const slug of b.items) {
          const p = allDisplayProducts.find((x) => x.slug === slug);
          if (p?.colors?.length && !bundleColorSelections[b.id]?.[i]?.[slug]) {
            missingColorIds.add(b.id);
          }
        }
      }
    }
    if (missingColorIds.size > 0) {
      setColorErrorBundles(missingColorIds);
      const firstId = [...missingColorIds][0];
      bundleRefs.current[firstId]?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    setStandaloneQty({});
    setStandaloneColorQty({});
    setDynQty({});
    setDynColorQty({});
    setBundleQty({});
    setBundleColorSelections({});
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
                  const items = b.items.map((s) => allDisplayProducts.find((p) => p.slug === s)).filter(Boolean) as DisplayProduct[];
                  const total = items.reduce((sum, i) => sum + (i.salePrice ?? i.price), 0);
                  const discounted = b.fixedPrice ?? Math.round(total * (1 - b.discountPct / 100));
                  const savingsPct = total > 0 ? Math.round(((total - discounted) / total) * 100) : 0;
                  const bundleOos = b.items.some((s) => allDisplayProducts.find((p) => p.slug === s)?.outOfStock === true);
                  const qty = bundleQty[b.id] ?? 0;
                  const isActive = !bundleOos && qty > 0;
                  const incBundle = () => setBundleQty((q) => ({ ...q, [b.id]: qty + 1 }));
                  const decBundle = () => {
                    const nq = Math.max(0, qty - 1);
                    setBundleQty((q) => ({ ...q, [b.id]: nq }));
                    setBundleColorSelections((prev) => ({ ...prev, [b.id]: (prev[b.id] ?? []).slice(0, nq) }));
                    if (nq === 0) setColorErrorBundles((prev) => { const n = new Set(prev); n.delete(b.id); return n; });
                  };
                  const colorProductsInBundle = items.filter((i) => (i.colors?.length ?? 0) > 0);
                  const allColorsSelected = Array.from({ length: qty }, (_, i) =>
                    colorProductsInBundle.every((cp) => !!bundleColorSelections[b.id]?.[i]?.[cp.slug])
                  ).every(Boolean);
                  return (
                    <div
                      key={b.id}
                      ref={(el) => { bundleRefs.current[b.id] = el; }}
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        bundleOos ? "opacity-55 border-border bg-white"
                        : colorErrorBundles.has(b.id) ? "border-destructive bg-red-50/40"
                        : isActive ? "border-deep-blue bg-soft"
                        : "border-border bg-white"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-display text-base leading-snug">{tl(b.title)}</p>
                          {bundleOos && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">{lang === "ar" ? "نفد المخزون" : "Out of stock"}</span>}
                          {isActive && <span className="text-[10px] font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5 shrink-0">× {qty}</span>}
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
                              {savingsPct > 0 && !bundleOos && <span className="ms-1.5 text-xs font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5">−{savingsPct}%</span>}
                            </p>
                            <span className={`price-tag text-lg ${bundleOos ? "text-muted-foreground" : "text-gradient"}`}>{formatEGP(discounted, lang)}</span>
                          </div>
                          {!bundleOos && (
                            <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-0.5 shrink-0">
                              <button type="button" onClick={decBundle} disabled={qty === 0} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors">
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-medium">{qty}</span>
                              <button type="button" onClick={incBundle} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Color selectors — one section per bundle instance */}
                      {isActive && colorProductsInBundle.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/60 space-y-4">
                          {Array.from({ length: qty }, (_, instanceIdx) => {
                            const instanceColors = bundleColorSelections[b.id]?.[instanceIdx] ?? {};
                            const instanceComplete = colorProductsInBundle.every((cp) => !!instanceColors[cp.slug]);
                            return (
                              <div key={instanceIdx} className={qty > 1 ? "rounded-xl border border-border/60 p-3 space-y-3" : "space-y-3"}>
                                {qty > 1 && (
                                  <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                                    <span className="inline-flex h-4 w-4 rounded-full bg-deep-blue text-white text-[10px] items-center justify-center shrink-0">{instanceIdx + 1}</span>
                                    {lang === "ar" ? `الباقة ${instanceIdx + 1}` : `Bundle ${instanceIdx + 1}`}
                                    {instanceComplete && <Check className="h-3 w-3 text-emerald-500 ms-auto" />}
                                  </p>
                                )}
                                <p className="text-xs font-medium text-ink flex items-center gap-1.5">
                                  <Check className="h-3.5 w-3.5 text-deep-blue" />
                                  {lang === "ar" ? "اختر لون كل منتج:" : "Choose a color for each product:"}
                                </p>
                                {colorProductsInBundle.map((cp) => {
                                  const selectedColorId = instanceColors[cp.slug];
                                  const selectedColor = cp.colors?.find((c) => c.id === selectedColorId);
                                  return (
                                    <div key={cp.slug}>
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <p className="text-xs text-muted-foreground" dir="ltr">{cp.title}</p>
                                        {selectedColor && <span className="text-xs font-medium text-ink">— {tl(selectedColor.label)}</span>}
                                        {!selectedColorId && <span className="text-[10px] text-destructive font-medium">{lang === "ar" ? "مطلوب" : "Required"}</span>}
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        {cp.colors!.map((c) => {
                                          const isSelected = selectedColorId === c.id;
                                          const colorOos = cp.outOfStockColors?.includes(c.id) === true
                                            || (!isSelected && isColorVirtuallyOos(cp.slug, c.id, b.id, instanceIdx));
                                          return (
                                            <button
                                              key={c.id}
                                              type="button"
                                              disabled={colorOos}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setBundleColorSelections((prev) => {
                                                  const instances = [...(prev[b.id] ?? [])];
                                                  instances[instanceIdx] = { ...(instances[instanceIdx] ?? {}), [cp.slug]: c.id };
                                                  return { ...prev, [b.id]: instances };
                                                });
                                                setColorErrorBundles((prev) => { const n = new Set(prev); n.delete(b.id); return n; });
                                              }}
                                              title={tl(c.label)}
                                              className={`relative h-7 w-7 rounded-full border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${isSelected ? "border-deep-blue scale-110 shadow-sm" : "border-transparent hover:border-deep-blue/40"}`}
                                              style={{ backgroundColor: c.hex }}
                                            >
                                              {colorOos && <span className="absolute inset-0 flex items-center justify-center"><span className="absolute w-[130%] h-px bg-white/80 rotate-45 origin-center" /></span>}
                                              {isSelected && <span className="absolute inset-0 flex items-center justify-center"><Check className="h-3.5 w-3.5 text-white drop-shadow" /></span>}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                          {colorErrorBundles.has(b.id) ? (
                            <p className="text-xs text-destructive font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              {lang === "ar" ? "اختر لون لكل منتج في كل الباقات عشان تكمل الأوردر" : "Select a color for each product in every bundle to continue"}
                            </p>
                          ) : !allColorsSelected ? (
                            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5">
                              {lang === "ar" ? "لازم تختار لون لكل منتج عشان تكمل الأوردر" : "You must select a color for each product to complete the order"}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
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
                  const bundleContribs = matchedBundles.filter((b) => b.items.includes(p.slug));
                  const standaloneQ = hasColors ? standaloneColorTotal(p.slug) : (standaloneQty[p.slug] ?? 0);
                  const totalQ = bundleContribs.length + standaloneQ;
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
                            {oos && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">{lang === "ar" ? "نفد المخزون" : "Out of stock"}</span>}
                            {totalQ > 0 && !oos && <span className="text-[10px] font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5 shrink-0">{lang === "ar" ? `× ${totalQ} في الكارت` : `× ${totalQ} in cart`}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tl(p.tagline)}</p>
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-sm price-tag text-gradient">{formatEGP(price, lang)}</span>
                            {onSale && <span className="text-[11px] text-muted-foreground line-through font-sans">{formatEGP(p.price, lang)}</span>}
                          </div>
                          {/* Bundle contribution badges */}
                          {bundleContribs.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {bundleContribs.map((b) => (
                                <span key={b.id} className="inline-flex items-center gap-1 text-[10px] font-medium text-deep-blue bg-deep-blue/8 border border-deep-blue/20 rounded-full px-2 py-0.5">
                                  <Sparkles className="h-2.5 w-2.5" />{tl(b.title)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Standalone qty stepper — non-color products */}
                        {!hasColors && !oos && (
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {bundleContribs.length > 0 && <span className="text-[10px] text-muted-foreground">{lang === "ar" ? "إضافي" : "Extra"}</span>}
                            <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-1">
                              <button type="button" onClick={() => dec(p.slug)} disabled={standaloneQ === 0} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors">
                                <Minus className="h-4 w-4" />
                              </button>
                              <input inputMode="numeric" value={standaloneQ} onChange={(e) => set(p.slug, parseInt(e.target.value.replace(/\D/g, ""), 10))} className="w-10 text-center bg-transparent text-sm font-medium focus:outline-none" />
                              <button type="button" onClick={() => inc(p.slug)} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Per-color standalone steppers */}
                      {hasColors && !oos && (
                        <div className="mt-3 ms-[76px] space-y-2">
                          {bundleContribs.length > 0 && (
                            <p className="text-xs text-deep-blue font-medium">
                              {lang === "ar" ? `من الباقات: ${bundleContribs.length} قطعة بدون لون محدد` : `From bundles: ${bundleContribs.length} unit(s) — color TBD`}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">{bundleContribs.length > 0 ? (lang === "ar" ? "إضافي حسب اللون:" : "Extra by color:") : (lang === "ar" ? "اختر اللون والكمية:" : "Choose color & qty:")}</p>
                          {p.colors!.map((c) => {
                            const colorOos = p.outOfStockColors?.includes(c.id) === true;
                            const cq = standaloneColorQty[p.slug]?.[c.id] ?? 0;
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
                                  <button type="button" onClick={() => incColor(p.slug, c.id)} disabled={colorOos || isColorMaxed(p.slug, c.id)} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {totalQ > 0 && (
                            <p className="text-xs text-muted-foreground pt-1">
                              {lang === "ar" ? `الإجمالي: ${totalQ} قطعة` : `Total: ${totalQ} item${totalQ !== 1 ? "s" : ""}`}
                              {" · "}{formatEGP(price * totalQ, lang)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {dynamicProducts.map((p) => {
                  const oos = p.outOfStock === true;
                  const hasColors = (p.colors?.length ?? 0) > 0;
                  const unitPrice = p.salePrice ?? p.price;
                  const onSale = p.salePrice != null;
                  const dynBundleContribs = matchedBundles.filter((b) => b.items.includes(p.slug));
                  const standaloneQ = hasColors ? dynColorTotal(p.slug) : (dynQty[p.slug] ?? 0);
                  const totalQ = dynBundleContribs.length + standaloneQ;
                  return (
                    <div key={p.id} className={`py-4 transition-opacity ${oos ? "opacity-55" : ""}`}>
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-16 rounded-xl bg-soft border border-border flex items-center justify-center overflow-hidden shrink-0">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt={p.title} loading="lazy" className={`w-full h-full object-cover ${oos ? "grayscale" : ""}`} />
                          ) : (
                            <ShoppingBag className="h-6 w-6 text-muted-foreground/40" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium text-ink leading-snug ${oos ? "line-through decoration-muted-foreground/50" : ""}`}>{lang === "ar" ? p.titleAr : p.title}</p>
                            {oos && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">{lang === "ar" ? "نفد المخزون" : "Out of stock"}</span>}
                            {totalQ > 0 && !oos && <span className="text-[10px] font-medium text-deep-blue bg-deep-blue/10 rounded-full px-2 py-0.5 shrink-0">{lang === "ar" ? `× ${totalQ} في الكارت` : `× ${totalQ} in cart`}</span>}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{lang === "ar" ? (p.descriptionAr || p.description) : p.description}</p>}
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="text-sm price-tag text-gradient">{formatEGP(unitPrice, lang)}</span>
                            {onSale && <span className="text-[11px] text-muted-foreground line-through font-sans">{formatEGP(p.price, lang)}</span>}
                          </div>
                          {dynBundleContribs.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {dynBundleContribs.map((b) => (
                                <span key={b.id} className="inline-flex items-center gap-1 text-[10px] font-medium text-deep-blue bg-deep-blue/8 border border-deep-blue/20 rounded-full px-2 py-0.5">
                                  <Sparkles className="h-2.5 w-2.5" />{tl(b.title)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {!hasColors && !oos && (
                          <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-1 shrink-0">
                            <button type="button" onClick={() => decDyn(p.slug)} disabled={standaloneQ === 0} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-medium">{standaloneQ}</span>
                            <button type="button" onClick={() => incDyn(p.slug)} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center transition-colors">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {hasColors && !oos && (
                        <div className="mt-3 ms-[76px] space-y-2">
                          <p className="text-xs text-muted-foreground">{lang === "ar" ? "اختر اللون والكمية:" : "Choose color & qty:"}</p>
                          {p.colors!.map((c) => {
                            const colorOos = inventoryStatus.colorQty?.[p.slug]?.[c.id] === 0;
                            const cq = dynColorQty[p.slug]?.[c.id] ?? 0;
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
                                  <button type="button" onClick={() => decDynColor(p.slug, c.id)} disabled={cq === 0 || colorOos} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 transition-colors">
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <span className="w-7 text-center text-sm font-medium">{cq}</span>
                                  <button type="button" onClick={() => incDynColor(p.slug, c.id)} disabled={colorOos || isColorMaxed(p.slug, c.id)} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {totalQ > 0 && (
                            <p className="text-xs text-muted-foreground pt-1">
                              {lang === "ar" ? `الإجمالي: ${totalQ} قطعة` : `Total: ${totalQ} item${totalQ !== 1 ? "s" : ""}`}
                              {" · "}{formatEGP(unitPrice * totalQ, lang)}
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
