export type OrderItem = {
  slug: string;
  colorId?: string;
  title: string;
  qty: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  createdAt: number;
  name: string;
  phone: string;
  address: string;
  city: string;
  zoneId: string;
  zoneLabel: string;
  items: OrderItem[];
  subtotal: number;
  bundleDiscount: number;
  promoDiscount: number;
  promoCode?: string;
  // Commission snapshot — copied from the promo code at order time so it
  // survives later edits/deletion of the promo definition.
  promoDoctorName?: string;
  promoDoctorPct?: number;
  promoReportName?: string;
  promoReportPct?: number;
  shippingFee: number;
  total: number;
  status: "pending" | "dispatched" | "delivered";
  notes?: string;
};

export type ColorQty = Record<string, number>;

export type InventoryEntry = {
  slug: string;
  qty: number;
  colorQty?: ColorQty;
};

export type PricingProduct = {
  slug: string;
  price?: number;
  salePrice?: number | null;
};

export type PricingBundle = {
  id: string;
  price: number;
};

export type PromoCodeEntry = {
  code: string;
  pct: number;
  label: string;
  // Optional referral commissions. When a name is set, every order using this
  // code earns that party the given percentage of the order total.
  doctorName?: string;
  doctorPct?: number; // default 10 when doctorName is set
  reportName?: string;
  reportPct?: number; // default 5 when reportName is set
};

export type Pricing = {
  products: PricingProduct[];
  bundles: PricingBundle[];
  promoCodes: PromoCodeEntry[];
};

// Mutable manager-controlled state for a single commission line (one party of
// one order). Amount/date are derived from the order; only these bits are
// editable. Keyed by `${orderId}:${party}` where party is "doctor" | "report".
export type CommissionState = {
  paid?: boolean;
  paidAt?: number;
  amountOverride?: number; // overrides the auto-computed commission amount
  archived?: boolean; // hidden from the ledger (e.g. after being paid & cleared)
};

export type FreeShippingWindow = {
  from: string; // ISO datetime string (local time, e.g. "2026-05-24T14:00")
  to: string;
} | null;

export type DynamicProduct = {
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  features?: { en: string; ar: string }[];
  price: number;
  salePrice?: number;
  images: string[]; // base64 data URLs
  colors?: { id: string; label: { en: string; ar: string }; hex: string }[];
  outOfStock?: boolean;
};

export type DynamicBundle = {
  id: string;
  titleEn: string;
  titleAr: string;
  taglineEn?: string;
  taglineAr?: string;
  items: string[]; // product slugs (static or dynamic)
  quantities?: Record<string, number>; // slug -> qty per bundle unit (defaults to 1)
  price: number;
};

export type BundleOverride = {
  titleEn?: string;
  titleAr?: string;
  taglineEn?: string;
  taglineAr?: string;
  items?: string[]; // slugs — static or dynamic
  quantities?: Record<string, number>; // slug -> qty per bundle unit (defaults to 1)
  discountPct?: number;
};

export type StaticProductOverride = {
  description?: string;
  descriptionAr?: string;
  taglineEn?: string;
  taglineAr?: string;
  features?: { en: string; ar: string }[];
  colors?: { id: string; label: { en: string; ar: string }; hex: string }[];
  related?: string[]; // product slugs
};

export type DbData = {
  orders: Order[];
  inventory: InventoryEntry[];
  pricing: Pricing;
  freeShipping: FreeShippingWindow;
  dynamicProducts: DynamicProduct[];
  dynamicBundles: DynamicBundle[];
  productImageOverrides: Record<string, string[]>; // slug -> base64 images
  productHidden: string[]; // slugs of hidden static products
  bundleHidden: string[]; // ids of hidden static (hardcoded) bundles
  staticOverrides: Record<string, StaticProductOverride>; // slug -> text/feature overrides
  bundleOverrides: Record<string, BundleOverride>; // bundleId -> config overrides
  reviewImages: string[]; // customer review images for homepage slider
  carouselImages: string[]; // home page "Our Products" showcase images
  commissionState: Record<string, CommissionState>; // `${orderId}:${party}` -> state
};
