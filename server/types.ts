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
  price: number;
  salePrice?: number;
  images: string[]; // base64 data URLs
  outOfStock?: boolean;
};

export type DbData = {
  orders: Order[];
  inventory: InventoryEntry[];
  pricing: Pricing;
  freeShipping: FreeShippingWindow;
  dynamicProducts: DynamicProduct[];
};
