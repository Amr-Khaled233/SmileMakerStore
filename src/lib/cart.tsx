import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { itemQty, type CartItem, type CartProductItem, type CartBundleItem } from "@/lib/shop";

const STORAGE_KEY = "sm-cart-v3";
const BUYNOW_KEY = "sm-buynow-v3";

const uid = () => Math.random().toString(36).slice(2, 10);

type CartCtx = {
  items: CartItem[];
  count: number;
  // Products
  addProduct: (slug: string, colorId: string | undefined, qty?: number) => void; // colorId "" = unchosen unit
  appendUnit: (slug: string) => void; // add one unchosen colour unit
  setUnitColor: (slug: string, unitIdx: number, colorId: string) => void;
  removeUnit: (slug: string, unitIdx: number) => void;
  setProductQty: (slug: string, qty: number) => void; // non-colour products
  removeProduct: (slug: string) => void;
  // Bundles
  addBundle: (bundleId: string) => void; // appends one instance (merges by bundleId)
  addBundleInstance: (lineId: string) => void;
  removeBundleInstance: (lineId: string, instanceIdx: number) => void;
  setBundleInstanceColor: (lineId: string, instanceIdx: number, slug: string, unitIdx: number, colorId: string) => void;
  removeBundle: (lineId: string) => void;
  // Misc
  clear: () => void;
  setBuyNow: (items: CartItem[]) => void;
  getBuyNow: () => CartItem[];
  clearBuyNow: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

const findProductIdx = (items: CartItem[], slug: string) => items.findIndex((i) => i.type === "product" && i.slug === slug);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // ── Products ──
  const addProduct = useCallback((slug: string, colorId: string | undefined, qty = 1) => {
    setItems((prev) => {
      const idx = findProductIdx(prev, slug);
      if (idx !== -1) {
        const cur = prev[idx] as CartProductItem;
        const next = [...prev];
        if (colorId !== undefined) {
          const colors = [...(cur.colors ?? []), ...Array(qty).fill(colorId)];
          next[idx] = { ...cur, qty: colors.length, colors };
        } else {
          next[idx] = { ...cur, qty: cur.qty + qty };
        }
        return next;
      }
      return [...prev, colorId !== undefined ? { type: "product", slug, qty, colors: Array(qty).fill(colorId) } : { type: "product", slug, qty }];
    });
  }, []);

  const appendUnit = useCallback((slug: string) => addProduct(slug, "", 1), [addProduct]);

  const setUnitColor = useCallback((slug: string, unitIdx: number, colorId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.type === "product" && i.slug === slug && i.colors ? { ...i, colors: i.colors.map((c, j) => (j === unitIdx ? colorId : c)) } : i)),
    );
  }, []);

  const removeUnit = useCallback((slug: string, unitIdx: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (!(i.type === "product" && i.slug === slug && i.colors)) return [i];
        const colors = i.colors.filter((_, j) => j !== unitIdx);
        return colors.length === 0 ? [] : [{ ...i, qty: colors.length, colors }];
      }),
    );
  }, []);

  const setProductQty = useCallback((slug: string, qty: number) => {
    setItems((prev) => prev.flatMap((i) => (i.type === "product" && i.slug === slug ? (qty <= 0 ? [] : [{ ...i, qty }]) : [i])));
  }, []);

  const removeProduct = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => !(i.type === "product" && i.slug === slug)));
  }, []);

  // ── Bundles ──
  const addBundle = useCallback((bundleId: string) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.type === "bundle" && i.bundleId === bundleId);
      if (idx !== -1) {
        const cur = prev[idx] as CartBundleItem;
        const next = [...prev];
        next[idx] = { ...cur, instances: [...cur.instances, {}] };
        return next;
      }
      return [...prev, { type: "bundle", lineId: uid(), bundleId, instances: [{}] }];
    });
  }, []);

  const addBundleInstance = useCallback((lineId: string) => {
    setItems((prev) => prev.map((i) => (i.type === "bundle" && i.lineId === lineId ? { ...i, instances: [...i.instances, {}] } : i)));
  }, []);

  const removeBundleInstance = useCallback((lineId: string, instanceIdx: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (!(i.type === "bundle" && i.lineId === lineId)) return [i];
        const instances = i.instances.filter((_, j) => j !== instanceIdx);
        return instances.length === 0 ? [] : [{ ...i, instances }];
      }),
    );
  }, []);

  const setBundleInstanceColor = useCallback((lineId: string, instanceIdx: number, slug: string, unitIdx: number, colorId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.type === "bundle" && i.lineId === lineId
          ? {
              ...i,
              instances: i.instances.map((inst, j) => {
                if (j !== instanceIdx) return inst;
                const picks = [...(inst[slug] ?? [])];
                while (picks.length <= unitIdx) picks.push("");
                picks[unitIdx] = colorId;
                return { ...inst, [slug]: picks };
              }),
            }
          : i,
      ),
    );
  }, []);

  const removeBundle = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((i) => !(i.type === "bundle" && i.lineId === lineId)));
  }, []);

  // ── Misc ──
  const clear = useCallback(() => setItems([]), []);

  const setBuyNow = useCallback((bn: CartItem[]) => {
    if (typeof window !== "undefined") sessionStorage.setItem(BUYNOW_KEY, JSON.stringify(bn));
  }, []);
  const getBuyNow = useCallback((): CartItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem(BUYNOW_KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }, []);
  const clearBuyNow = useCallback(() => {
    if (typeof window !== "undefined") sessionStorage.removeItem(BUYNOW_KEY);
  }, []);

  const count = useMemo(() => items.reduce((s, i) => s + itemQty(i), 0), [items]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count,
      addProduct,
      appendUnit,
      setUnitColor,
      removeUnit,
      setProductQty,
      removeProduct,
      addBundle,
      addBundleInstance,
      removeBundleInstance,
      setBundleInstanceColor,
      removeBundle,
      clear,
      setBuyNow,
      getBuyNow,
      clearBuyNow,
    }),
    [items, count, addProduct, appendUnit, setUnitColor, removeUnit, setProductQty, removeProduct, addBundle, addBundleInstance, removeBundleInstance, setBundleInstanceColor, removeBundle, clear, setBuyNow, getBuyNow, clearBuyNow],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
