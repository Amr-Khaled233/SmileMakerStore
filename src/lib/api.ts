import type { Order, OrderItem, InventoryEntry, Pricing, PromoCodeEntry, DynamicProduct, DynamicBundle, StaticProductOverride, BundleOverride } from "../../server/types.js";

export type { Order, OrderItem, InventoryEntry, Pricing, PromoCodeEntry, DynamicProduct, DynamicBundle, StaticProductOverride, BundleOverride };

export type PublicInventoryStatus = {
  outOfStock: string[];
  outOfStockColors: Record<string, string[]>;
  colorQty: Record<string, Record<string, number>>;
};

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (password: string) =>
    req<{ token: string }>("POST", "/auth/login", { password }),

  // Orders (manager)
  getOrders: (token: string) =>
    req<Order[]>("GET", "/orders", undefined, token),
  updateOrderStatus: (token: string, id: string, status: "pending" | "dispatched" | "delivered") =>
    req<{ success: boolean }>("PATCH", `/orders/${id}`, { status }, token),
  deleteOrder: (token: string, id: string) =>
    req<{ success: boolean }>("DELETE", `/orders/${id}`, undefined, token),

  // Orders (public — from checkout)
  createOrder: (order: Omit<Order, "createdAt" | "status">) =>
    req<{ success: boolean; id: string }>("POST", "/orders", order),

  // Inventory (manager)
  getInventory: (token: string) =>
    req<InventoryEntry[]>("GET", "/inventory", undefined, token),
  updateProductQty: (token: string, slug: string, qty: number) =>
    req<{ success: boolean }>("PATCH", `/inventory/${slug}`, { qty }, token),
  updateColorQty: (
    token: string,
    slug: string,
    colorId: string,
    qty: number
  ) =>
    req<{ success: boolean }>(
      "PATCH",
      `/inventory/${slug}/colors/${colorId}`,
      { qty },
      token
    ),

  // Inventory (public — for out-of-stock display)
  getInventoryStatus: () =>
    req<PublicInventoryStatus>("GET", "/inventory/public"),

  // Pricing (public — for order page)
  getPricingPublic: () =>
    req<Pricing>("GET", "/pricing/public"),

  // Pricing (manager)
  getPricing: (token: string) =>
    req<Pricing>("GET", "/pricing", undefined, token),
  updateProductPrice: (token: string, slug: string, price: number, salePrice: number | null) =>
    req<{ success: boolean }>("PATCH", `/pricing/products/${slug}`, { price, salePrice }, token),
  updateBundlePrice: (token: string, id: string, price: number) =>
    req<{ success: boolean }>("PATCH", `/pricing/bundles/${id}`, { price }, token),
  upsertPromoCode: (token: string, code: string, pct: number, label: string) =>
    req<{ success: boolean }>("POST", "/pricing/promoCodes", { code, pct, label }, token),
  deletePromoCode: (token: string, code: string) =>
    req<{ success: boolean }>("DELETE", `/pricing/promoCodes/${encodeURIComponent(code)}`, undefined, token),

  // Edit order total / notes / items (manager)
  editOrder: (token: string, id: string, patch: {
    total?: number;
    notes?: string;
    items?: OrderItem[];
    subtotal?: number;
    bundleDiscount?: number;
    promoDiscount?: number;
    shippingFee?: number;
  }) =>
    req<{ success: boolean }>("PATCH", `/orders/${id}`, patch, token),

  // Dynamic products (public)
  getDynamicProducts: () =>
    req<DynamicProduct[]>("GET", "/products"),
  getProductsMeta: () =>
    req<{ imageOverrides: Record<string, string[]>; hidden: string[]; staticOverrides: Record<string, StaticProductOverride>; bundleOverrides: Record<string, BundleOverride> }>("GET", "/products/meta"),

  // Dynamic products (manager)
  createProduct: (token: string, data: Partial<DynamicProduct>) =>
    req<{ success: boolean; product: DynamicProduct }>("POST", "/products", data, token),
  deleteProduct: (token: string, id: string) =>
    req<{ success: boolean }>("DELETE", `/products/${id}`, undefined, token),
  updateProduct: (token: string, id: string, patch: Partial<DynamicProduct>) =>
    req<{ success: boolean }>("PATCH", `/products/${id}`, patch, token),
  addProductImage: (token: string, id: string, image: string) =>
    req<{ success: boolean }>("POST", `/products/${id}/images`, { image }, token),
  setProductPrimaryImage: (token: string, id: string, image: string) =>
    req<{ success: boolean }>("PUT", `/products/${id}/images/primary`, { image }, token),
  removeProductImage: (token: string, id: string, idx: number) =>
    req<{ success: boolean }>("DELETE", `/products/${id}/images/${idx}`, undefined, token),
  setDynProductImagePrimary: (token: string, id: string, idx: number) =>
    req<{ success: boolean }>("PATCH", `/products/${id}/images/${idx}/primary`, undefined, token),
  replaceDynProductImage: (token: string, id: string, idx: number, image: string) =>
    req<{ success: boolean }>("PUT", `/products/${id}/images/${idx}`, { image }, token),

  // Static product image overrides (manager)
  setStaticProductImages: (token: string, slug: string, images: string[]) =>
    req<{ success: boolean }>("PUT", `/products/static/${slug}/images`, { images }, token),
  addStaticProductImage: (token: string, slug: string, image: string) =>
    req<{ success: boolean }>("POST", `/products/static/${slug}/images`, { image }, token),
  removeStaticProductImage: (token: string, slug: string, idx: number) =>
    req<{ success: boolean }>("DELETE", `/products/static/${slug}/images/${idx}`, undefined, token),
  setStaticProductImagePrimary: (token: string, slug: string, idx: number) =>
    req<{ success: boolean }>("PATCH", `/products/static/${slug}/images/${idx}/primary`, undefined, token),
  replaceStaticProductImage: (token: string, slug: string, idx: number, image: string) =>
    req<{ success: boolean }>("PUT", `/products/static/${slug}/images/${idx}`, { image }, token),
  clearStaticProductImages: (token: string, slug: string) =>
    req<{ success: boolean }>("DELETE", `/products/static/${slug}/images`, undefined, token),
  setProductVisibility: (token: string, slug: string, hidden: boolean) =>
    req<{ success: boolean }>("PATCH", `/products/static/${slug}/visibility`, { hidden }, token),
  updateStaticProductDetails: (token: string, slug: string, patch: Partial<StaticProductOverride>) =>
    req<{ success: boolean }>("PATCH", `/products/static/${slug}/details`, patch, token),
  updateBundle: (token: string, id: string, patch: Partial<BundleOverride>) =>
    req<{ success: boolean }>("PATCH", `/products/bundles/${id}`, patch, token),

  // User-created bundles (public)
  getDynamicBundles: () =>
    req<DynamicBundle[]>("GET", "/bundles"),

  // User-created bundles (manager)
  createDynamicBundle: (token: string, data: Omit<DynamicBundle, "id">) =>
    req<{ success: boolean; bundle: DynamicBundle }>("POST", "/bundles", data, token),
  updateDynamicBundle: (token: string, id: string, patch: Partial<Omit<DynamicBundle, "id">>) =>
    req<{ success: boolean }>("PATCH", `/bundles/${id}`, patch, token),
  deleteDynamicBundle: (token: string, id: string) =>
    req<{ success: boolean }>("DELETE", `/bundles/${id}`, undefined, token),

  // Free shipping window (public)
  getFreeShippingStatus: () =>
    req<{ active: boolean }>("GET", "/settings/free-shipping/public"),

  // Free shipping window (manager)
  getFreeShipping: (token: string) =>
    req<{ from: string; to: string } | null>("GET", "/settings/free-shipping", undefined, token),
  setFreeShipping: (token: string, from: string, to: string) =>
    req<{ success: boolean }>("PUT", "/settings/free-shipping", { from, to }, token),
  clearFreeShipping: (token: string) =>
    req<{ success: boolean }>("DELETE", "/settings/free-shipping", undefined, token),

  // Review images (homepage slider)
  getReviewImages: () =>
    req<string[]>("GET", "/reviews"),
  addReviewImage: (token: string, image: string) =>
    req<{ success: boolean }>("POST", "/reviews", { image }, token),
  deleteReviewImage: (token: string, idx: number) =>
    req<{ success: boolean }>("DELETE", `/reviews/${idx}`, undefined, token),
};

// Manager token helpers — sessionStorage so the token is cleared when the browser tab/session closes.
// This means a password is required on every new visit, which is intentional for security.
const TOKEN_KEY = "sm-manager-token";
export const getToken = () =>
  typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
export const saveToken = (t: string) => sessionStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);
