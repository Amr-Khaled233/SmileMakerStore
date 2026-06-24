import { useEffect, useState } from "react";
import {
  PRODUCTS,
  BUNDLES,
  SHIPPING_ZONES,
  type ColorOption,
} from "@/data/products";
import {
  api,
  type Pricing,
  type DynamicProduct,
  type DynamicBundle,
  type BundleOverride,
  type StaticProductOverride,
  type PublicInventoryStatus,
} from "@/lib/api";
import type { Lang } from "@/lib/i18n";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShopProduct = {
  slug: string;
  title: string; // base / English brand name
  titleAr?: string; // dynamic products only
  image: string;
  price: number;
  salePrice?: number;
  outOfStock: boolean;
  colors?: ColorOption[];
  outOfStockColors: string[];
  colorQty?: Record<string, number>;
  isDynamic: boolean;
};

export type ShopBundle = {
  id: string;
  title: { en: string; ar: string };
  tagline: { en: string; ar: string };
  items: string[]; // product slugs (each appears once)
  quantities: Record<string, number>; // slug -> qty per bundle unit (defaults to 1)
  discountPct: number;
  fixedPrice?: number;
};

// How many units of a given product one bundle unit contains (default 1).
export const bundleItemQty = (b: ShopBundle, slug: string): number => {
  const q = b.quantities[slug];
  return q && q > 0 ? q : 1;
};

// A product line in the cart. Colour products carry one colorId PER UNIT in
// `colors` (length === qty); non-colour products just use qty.
export type CartProductItem = { type: "product"; slug: string; qty: number; colors?: string[] };
// A bundle line. Each unit is an "instance" with its own colour map
// (slug → one colorId PER contained piece, so a product with qty > 1 in the
// bundle can have a different colour for each piece).
export type CartBundleItem = { type: "bundle"; lineId: string; bundleId: string; instances: Array<Record<string, string[]>> };
export type CartItem = CartProductItem | CartBundleItem;

export const itemQty = (it: CartItem): number => (it.type === "product" ? it.qty : it.instances.length);

export type ShopData = {
  products: ShopProduct[];
  bundles: ShopBundle[];
  promoCodes: { code: string; pct: number }[];
  inventory: PublicInventoryStatus;
  freeShippingActive: boolean;
  ready: boolean;
};

export type OrderLine = { slug: string; colorId?: string; title: string; qty: number; lineTotal: number };

// ─── Data loading (mirrors the old order page, in one reusable hook) ───────────

const EMPTY_INVENTORY: PublicInventoryStatus = { outOfStock: [], outOfStockColors: {}, colorQty: {}, qty: {} };

export function useShopData(): ShopData {
  const [data, setData] = useState<ShopData>({
    products: [],
    bundles: [],
    promoCodes: [],
    inventory: EMPTY_INVENTORY,
    freeShippingActive: false,
    ready: false,
  });

  useEffect(() => {
    Promise.all([
      api.getInventoryStatus().catch((): PublicInventoryStatus => EMPTY_INVENTORY),
      api.getPricingPublic().catch((): Pricing => ({ products: [], bundles: [], promoCodes: [] })),
      api.getFreeShippingStatus().catch(() => ({ active: false })),
      api.getDynamicProducts().catch((): DynamicProduct[] => []),
      api.getDynamicBundles().catch((): DynamicBundle[] => []),
      api
        .getProductsMeta()
        .catch(() => ({ imageOverrides: {} as Record<string, string[]>, hidden: [] as string[], bundleHidden: [] as string[], staticOverrides: {} as Record<string, StaticProductOverride>, bundleOverrides: {} as Record<string, BundleOverride> })),
    ]).then(([inv, pricing, fs, dynProds, dynBundles, meta]) => {
      const hidden = new Set(meta.hidden ?? []);
      const hiddenBundles = new Set(meta.bundleHidden ?? []);

      const staticProducts: ShopProduct[] = PRODUCTS.filter((p) => !hidden.has(p.slug)).map((p) => {
        const priceOv = pricing.products.find((x) => x.slug === p.slug);
        const colorOv = meta.staticOverrides?.[p.slug]?.colors;
        const imgOv = meta.imageOverrides?.[p.slug];
        return {
          slug: p.slug,
          title: p.title,
          image: imgOv?.[0] ?? p.image,
          price: priceOv?.price ?? p.price,
          salePrice: priceOv !== undefined ? (priceOv.salePrice ?? undefined) : p.salePrice,
          outOfStock: inv.outOfStock.includes(p.slug) ? true : !!p.outOfStock,
          colors: colorOv ?? p.colors,
          outOfStockColors: inv.outOfStockColors[p.slug] ?? p.outOfStockColors ?? [],
          colorQty: inv.colorQty[p.slug],
          isDynamic: false,
        };
      });

      const dynamicProducts: ShopProduct[] = dynProds
        .filter((p) => !hidden.has(p.slug))
        .map((p) => ({
          slug: p.slug,
          title: p.title,
          titleAr: p.titleAr,
          image: p.images[0] ?? "",
          price: p.price,
          salePrice: p.salePrice,
          outOfStock: inv.outOfStock.includes(p.slug) ? true : !!p.outOfStock,
          colors: p.colors,
          outOfStockColors: inv.outOfStockColors[p.slug] ?? [],
          colorQty: inv.colorQty[p.slug],
          isDynamic: true,
        }));

      const staticBundles: ShopBundle[] = BUNDLES.filter((b) => !hiddenBundles.has(b.id)).map((b) => {
        const priceOv = pricing.bundles.find((x) => x.id === b.id);
        const cfg = meta.bundleOverrides?.[b.id];
        return {
          id: b.id,
          title: { en: cfg?.titleEn || b.title.en, ar: cfg?.titleAr || b.title.ar },
          tagline: { en: cfg?.taglineEn || b.tagline.en, ar: cfg?.taglineAr || b.tagline.ar },
          items: cfg?.items ?? b.items,
          quantities: cfg?.quantities ?? {},
          discountPct: cfg?.discountPct ?? b.discountPct,
          fixedPrice: priceOv?.price,
        };
      });

      const userBundles: ShopBundle[] = dynBundles.map((b) => ({
        id: b.id,
        title: { en: b.titleEn, ar: b.titleAr },
        tagline: { en: b.taglineEn ?? "", ar: b.taglineAr ?? "" },
        items: b.items,
        quantities: b.quantities ?? {},
        discountPct: 0,
        fixedPrice: pricing.bundles.find((x) => x.id === b.id)?.price ?? b.price,
      }));

      setData({
        products: [...staticProducts, ...dynamicProducts],
        bundles: [...staticBundles, ...userBundles],
        promoCodes: pricing.promoCodes,
        inventory: inv,
        freeShippingActive: fs.active,
        ready: true,
      });
    });
  }, []);

  return data;
}

// ─── Pure helpers (shared by cart, checkout, product pages) ────────────────────

export const unitPrice = (p: ShopProduct) => p.salePrice ?? p.price;
export const findProduct = (data: ShopData, slug: string) => data.products.find((p) => p.slug === slug);
export const findBundle = (data: ShopData, id: string) => data.bundles.find((b) => b.id === id);
export const shopTitle = (p: ShopProduct, lang: Lang) => (p.isDynamic && lang === "ar" && p.titleAr ? p.titleAr : p.title);

export const colorAvail = (data: ShopData, slug: string, colorId: string): number | undefined =>
  data.inventory.colorQty?.[slug]?.[colorId];

export const isProductOos = (data: ShopData, slug: string): boolean => {
  const p = findProduct(data, slug);
  return p ? p.outOfStock : data.inventory.outOfStock.includes(slug);
};

export const isColorOos = (data: ShopData, slug: string, colorId: string): boolean => {
  if ((data.inventory.outOfStockColors?.[slug] ?? []).includes(colorId)) return true;
  const a = colorAvail(data, slug, colorId);
  return a !== undefined && a <= 0;
};

// Colours that can still be ordered for a product.
export const availableColors = (p: ShopProduct, data: ShopData): ColorOption[] =>
  (p.colors ?? []).filter((c) => !isColorOos(data, p.slug, c.id));

// How many units of a slug+colour are already committed across the whole cart
// (per-unit product colours + bundle instances that picked that colour).
export function consumedColor(items: CartItem[], data: ShopData, slug: string, colorId: string): number {
  let n = 0;
  for (const it of items) {
    if (it.type === "product") {
      if (it.slug === slug && it.colors) n += it.colors.filter((c) => c === colorId).length;
    } else {
      const b = findBundle(data, it.bundleId);
      if (!b || !b.items.includes(slug)) continue;
      // Each instance holds one colour per contained piece of the slug; count
      // every piece whose chosen colour matches.
      for (const inst of it.instances) for (const c of inst[slug] ?? []) if (c === colorId) n += 1;
    }
  }
  return n;
}

// Units of a colour still orderable (stock minus what's already in the cart).
// Returns Infinity when the colour has no tracked quantity (treated as unlimited).
export function colorRemaining(items: CartItem[], data: ShopData, slug: string, colorId: string): number {
  if (isColorOos(data, slug, colorId)) return 0;
  const avail = colorAvail(data, slug, colorId);
  if (avail === undefined) return Infinity;
  return Math.max(0, avail - consumedColor(items, data, slug, colorId));
}

// Total units of a product still orderable (for non-colour products mainly).
// Returns Infinity when the product has no tracked stock entry (unlimited).
export function productRemaining(items: CartItem[], data: ShopData, slug: string): number {
  const avail = data.inventory.qty?.[slug];
  if (avail === undefined) return Infinity;
  const consumed = cartToLines(items, data, "en")
    .filter((l) => l.slug === slug)
    .reduce((s, l) => s + l.qty, 0);
  return Math.max(0, avail - consumed);
}

// Expand the cart into deduped order line items (per-unit colours + bundles →
// their component items), grouped by slug + colour.
export function cartToLines(cart: CartItem[], data: ShopData, lang: Lang): OrderLine[] {
  const acc = new Map<string, OrderLine>();
  const add = (slug: string, colorId: string | undefined, units: number) => {
    if (units <= 0) return;
    const p = findProduct(data, slug);
    if (!p) return;
    const color = colorId ? p.colors?.find((c) => c.id === colorId) : undefined;
    const title = shopTitle(p, lang) + (color ? ` — ${color.label[lang]}` : "");
    const unit = unitPrice(p);
    const key = colorId ? `${slug}__${colorId}` : slug;
    const ex = acc.get(key);
    acc.set(key, ex ? { ...ex, qty: ex.qty + units, lineTotal: ex.lineTotal + unit * units } : { slug, colorId, title, qty: units, lineTotal: unit * units });
  };

  for (const it of cart) {
    if (it.type === "product") {
      const p = findProduct(data, it.slug);
      if (!p) continue;
      if (p.colors?.length && it.colors) {
        for (const cid of it.colors) add(it.slug, cid || undefined, 1);
      } else {
        add(it.slug, undefined, it.qty);
      }
    } else {
      const b = findBundle(data, it.bundleId);
      if (!b) continue;
      for (const inst of it.instances) {
        for (const slug of b.items) {
          const p = findProduct(data, slug);
          if (!p) continue;
          const qty = bundleItemQty(b, slug);
          if (p.colors?.length) {
            const picks = inst[slug] ?? [];
            for (let u = 0; u < qty; u++) add(slug, picks[u] || undefined, 1); // one piece per colour pick
          } else {
            add(slug, undefined, qty);
          }
        }
      }
    }
  }
  return [...acc.values()];
}

export function bundleDiscountTotal(cart: CartItem[], data: ShopData): number {
  let sum = 0;
  for (const it of cart) {
    if (it.type !== "bundle") continue;
    const b = findBundle(data, it.bundleId);
    if (!b) continue;
    const itemsSum = b.items.reduce((s, slug) => {
      const p = findProduct(data, slug);
      return s + (p ? unitPrice(p) * bundleItemQty(b, slug) : 0);
    }, 0);
    const discount = b.fixedPrice !== undefined ? Math.max(0, itemsSum - b.fixedPrice) : Math.round((itemsSum * b.discountPct) / 100);
    sum += discount * it.instances.length;
  }
  return sum;
}

export type Totals = { subtotal: number; bundleDiscount: number; promoDiscount: number; shippingFee: number; total: number };

export function computeTotals(cart: CartItem[], data: ShopData, opts: { promoPct?: number; zoneId: string }): Totals {
  const lines = cartToLines(cart, data, "en");
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const bundleDiscount = bundleDiscountTotal(cart, data);
  const promoPct = opts.promoPct ?? 0;
  const promoDiscount = promoPct ? Math.round(((subtotal - bundleDiscount) * promoPct) / 100) : 0;
  const zone = SHIPPING_ZONES.find((z) => z.id === opts.zoneId) ?? SHIPPING_ZONES[0];
  const shippingFee = lines.length > 0 && !data.freeShippingActive ? zone.fee : 0;
  const total = Math.max(0, subtotal - bundleDiscount - promoDiscount) + shippingFee;
  return { subtotal, bundleDiscount, promoDiscount, shippingFee, total };
}

// Returns human-readable problems that block checkout (stock / missing colours).
export function validateStock(cart: CartItem[], data: ShopData, lang: Lang): string[] {
  const errs: string[] = [];

  // Missing per-unit / per-instance colours
  for (const it of cart) {
    if (it.type === "product") {
      const p = findProduct(data, it.slug);
      if (p?.colors?.length && it.colors?.some((c) => !c)) {
        errs.push(lang === "ar" ? `${shopTitle(p, lang)}: اختر لون لكل قطعة` : `${shopTitle(p, lang)}: choose a colour for every unit`);
      }
    } else {
      const b = findBundle(data, it.bundleId);
      if (!b) continue;
      const missing = it.instances.some((inst) =>
        b.items.some((slug) => {
          const p = findProduct(data, slug);
          if (!(p?.colors?.length)) return false;
          const picks = inst[slug] ?? [];
          for (let u = 0; u < bundleItemQty(b, slug); u++) if (!picks[u]) return true; // a piece is missing its colour
          return false;
        }),
      );
      if (missing) errs.push(lang === "ar" ? `${b.title.ar}: اختر لون لكل منتج في كل باقة` : `${b.title.en}: choose a colour for each product in every bundle`);
    }
  }

  // Stock / OOS on the resolved lines
  for (const l of cartToLines(cart, data, lang)) {
    if (l.colorId) {
      if (isColorOos(data, l.slug, l.colorId)) {
        errs.push(lang === "ar" ? `${l.title}: نفد من المخزون` : `${l.title}: out of stock`);
        continue;
      }
      const avail = colorAvail(data, l.slug, l.colorId);
      if (avail !== undefined && l.qty > avail) {
        errs.push(lang === "ar" ? `${l.title}: متاح ${avail} فقط` : `${l.title}: only ${avail} available`);
      }
    } else if (isProductOos(data, l.slug)) {
      errs.push(lang === "ar" ? `${l.title}: نفد من المخزون` : `${l.title}: out of stock`);
    } else {
      const avail = data.inventory.qty?.[l.slug];
      if (avail !== undefined && l.qty > avail) {
        errs.push(lang === "ar" ? `${l.title}: متاح ${avail} فقط` : `${l.title}: only ${avail} available`);
      }
    }
  }

  return errs;
}

// Build the payload for api.createOrder from the current cart + form + totals.
export function buildOrderItems(cart: CartItem[], data: ShopData, lang: Lang) {
  return cartToLines(cart, data, lang).map((l) => ({ slug: l.slug, colorId: l.colorId, title: l.title, qty: l.qty, lineTotal: l.lineTotal }));
}
