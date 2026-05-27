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
};

export type Pricing = {
  products: PricingProduct[];
  bundles: PricingBundle[];
  promoCodes: PromoCodeEntry[];
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
  price: number;
};

export type BundleOverride = {
  titleEn?: string;
  titleAr?: string;
  taglineEn?: string;
  taglineAr?: string;
  items?: string[]; // slugs — static or dynamic
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
  staticOverrides: Record<string, StaticProductOverride>; // slug -> text/feature overrides
  bundleOverrides: Record<string, BundleOverride>; // bundleId -> config overrides
  reviewImages: string[]; // customer review images for homepage slider
};
