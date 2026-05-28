import { useEffect, useState, useCallback } from "react";
import { Package } from "lucide-react";
import { api } from "@/lib/api";
import type { InventoryEntry, DynamicProduct } from "@/lib/api";
import { PRODUCTS, formatEGP } from "@/data/products";

export function InventorySection({ token }: { token: string }) {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [dynProds, setDynProds] = useState<DynamicProduct[]>([]);
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [data, dynProdsData] = await Promise.all([api.getInventory(token), api.getDynamicProducts().catch(() => [] as DynamicProduct[])]);
    setInventory(data);
    setDynProds(dynProdsData);
    const draft: Record<string, number> = {};
    for (const e of data) {
      draft[e.slug] = e.qty;
      if (e.colorQty) {
        for (const [cid, q] of Object.entries(e.colorQty)) {
          draft[`${e.slug}__${cid}`] = q;
        }
      }
    }
    setDraftQty(draft);
    setLoaded(true);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const getEntry = (slug: string) =>
    inventory.find((e) => e.slug === slug) ?? { slug, qty: 0 };

  // When a color qty changes, also recompute the product total
  const updateColorDraft = (slug: string, colorId: string, newVal: number) => {
    const product = PRODUCTS.find((p) => p.slug === slug) ?? dynProds.find((p) => p.slug === slug);
    const colors = product && 'colors' in product ? product.colors : undefined;
    const colorKey = `${slug}__${colorId}`;
    setDraftQty((d) => {
      const next = { ...d, [colorKey]: newVal };
      if (colors) {
        const total = colors.reduce((sum, c) => {
          const ck = `${slug}__${c.id}`;
          return sum + (next[ck] ?? 0);
        }, 0);
        next[slug] = total;
      }
      return next;
    });
  };

  const saveProduct = async (slug: string) => {
    setSaving((s) => ({ ...s, [slug]: true }));
    await api.updateProductQty(token, slug, draftQty[slug] ?? 0);
    await load();
    setSaving((s) => ({ ...s, [slug]: false }));
  };

  const saveColor = async (slug: string, colorId: string) => {
    const key = `${slug}__${colorId}`;
    setSaving((s) => ({ ...s, [key]: true }));
    await api.updateColorQty(token, slug, colorId, draftQty[key] ?? 0);
    // Sync total product qty = sum of all color qtys
    const product = PRODUCTS.find((p) => p.slug === slug) ?? dynProds.find((p) => p.slug === slug);
    const colors = product && 'colors' in product ? product.colors : undefined;
    if (colors) {
      const total = colors.reduce((sum, c) => sum + (draftQty[`${slug}__${c.id}`] ?? 0), 0);
      await api.updateProductQty(token, slug, total);
    }
    await load();
    setSaving((s) => ({ ...s, [key]: false }));
  };

  if (!loaded) {
    return <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-4">
      {PRODUCTS.map((p) => {
        const entry = getEntry(p.slug);
        const productQty = draftQty[p.slug] ?? entry.qty;
        const isOos = entry.qty === 0;

        return (
          <div key={p.slug} className="lux-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-soft border border-border overflow-hidden shrink-0 flex items-center justify-center">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-ink" dir="ltr">{p.title}</p>
                  {isOos && (
                    <span className="text-[10px] font-medium text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                      نفد المخزون
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatEGP(p.salePrice ?? p.price)} EGP
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {p.colors ? (
                  /* For color products: total is read-only (auto-summed from colors below) */
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-soft px-3 py-2">
                    <span className="text-xs text-muted-foreground">الإجمالي:</span>
                    <span className="text-sm font-medium text-ink w-8 text-center">{productQty}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setDraftQty((d) => ({ ...d, [p.slug]: Math.max(0, (d[p.slug] ?? entry.qty) - 1) }))}
                      className="h-8 w-8 rounded-lg hover:bg-soft flex items-center justify-center text-lg leading-none"
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      value={productQty}
                      onChange={(e) => setDraftQty((d) => ({ ...d, [p.slug]: Math.max(0, Number(e.target.value) || 0) }))}
                      className="w-14 text-center bg-transparent text-sm font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftQty((d) => ({ ...d, [p.slug]: (d[p.slug] ?? entry.qty) + 1 }))}
                      className="h-8 w-8 rounded-lg hover:bg-soft flex items-center justify-center text-lg leading-none"
                    >+</button>
                  </div>
                )}
                {!p.colors && (
                  <button
                    onClick={() => saveProduct(p.slug)}
                    disabled={saving[p.slug]}
                    className="btn-ghost text-xs py-2 px-4 disabled:opacity-50"
                  >
                    {saving[p.slug] ? "..." : "حفظ"}
                  </button>
                )}
              </div>
            </div>

            {p.colors && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground mb-3">الألوان:</p>
                {p.colors.map((c) => {
                  const colorKey = `${p.slug}__${c.id}`;
                  const colorEntry = entry.colorQty?.[c.id];
                  const colorQtyVal = draftQty[colorKey] ?? colorEntry ?? 0;
                  const colorOos = colorEntry === 0;

                  return (
                    <div key={c.id} className="flex items-center gap-3 ms-2">
                      <span className="h-4 w-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                      <span className="text-sm text-ink w-20">{c.label.ar}</span>
                      {colorOos && <span className="text-[10px] text-destructive">نفد</span>}
                      <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 ms-auto">
                        <button
                          type="button"
                          onClick={() => updateColorDraft(p.slug, c.id, Math.max(0, colorQtyVal - 1))}
                          className="h-7 w-7 rounded-lg hover:bg-soft flex items-center justify-center text-base leading-none"
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          value={colorQtyVal}
                          onChange={(e) => updateColorDraft(p.slug, c.id, Math.max(0, Number(e.target.value) || 0))}
                          className="w-12 text-center bg-transparent text-sm font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateColorDraft(p.slug, c.id, colorQtyVal + 1)}
                          className="h-7 w-7 rounded-lg hover:bg-soft flex items-center justify-center text-base leading-none"
                        >+</button>
                      </div>
                      <button
                        onClick={() => saveColor(p.slug, c.id)}
                        disabled={saving[colorKey]}
                        className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50"
                      >
                        {saving[colorKey] ? "..." : "حفظ"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Dynamic products */}
      {dynProds.map((p) => {
        const entry = getEntry(p.slug);
        const productQty = draftQty[p.slug] ?? entry.qty;
        const isOos = entry.qty === 0;
        const hasColors = (p.colors?.length ?? 0) > 0;

        return (
          <div key={p.slug} className="lux-card p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-soft border border-border overflow-hidden shrink-0 flex items-center justify-center">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-ink" dir="ltr">{p.title}</p>
                  {isOos && (
                    <span className="text-[10px] font-medium text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                      نفد المخزون
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatEGP(p.salePrice ?? p.price)} EGP
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasColors ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-soft px-3 py-2">
                    <span className="text-xs text-muted-foreground">الإجمالي:</span>
                    <span className="text-sm font-medium text-ink w-8 text-center">{productQty}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setDraftQty((d) => ({ ...d, [p.slug]: Math.max(0, (d[p.slug] ?? entry.qty) - 1) }))}
                      className="h-8 w-8 rounded-lg hover:bg-soft flex items-center justify-center text-lg leading-none"
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      value={productQty}
                      onChange={(e) => setDraftQty((d) => ({ ...d, [p.slug]: Math.max(0, Number(e.target.value) || 0) }))}
                      className="w-14 text-center bg-transparent text-sm font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftQty((d) => ({ ...d, [p.slug]: (d[p.slug] ?? entry.qty) + 1 }))}
                      className="h-8 w-8 rounded-lg hover:bg-soft flex items-center justify-center text-lg leading-none"
                    >+</button>
                  </div>
                )}
                {!hasColors && (
                  <button
                    onClick={() => saveProduct(p.slug)}
                    disabled={saving[p.slug]}
                    className="btn-ghost text-xs py-2 px-4 disabled:opacity-50"
                  >
                    {saving[p.slug] ? "..." : "حفظ"}
                  </button>
                )}
              </div>
            </div>

            {hasColors && p.colors && (
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground mb-3">الألوان:</p>
                {p.colors.map((c) => {
                  const colorKey = `${p.slug}__${c.id}`;
                  const colorEntry = entry.colorQty?.[c.id];
                  const colorQtyVal = draftQty[colorKey] ?? colorEntry ?? 0;
                  const colorOos = colorEntry === 0;

                  return (
                    <div key={c.id} className="flex items-center gap-3 ms-2">
                      <span className="h-4 w-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                      <span className="text-sm text-ink w-20">{c.label.ar}</span>
                      {colorOos && <span className="text-[10px] text-destructive">نفد</span>}
                      <div className="flex items-center gap-1 rounded-xl border border-border bg-white p-1 ms-auto">
                        <button
                          type="button"
                          onClick={() => updateColorDraft(p.slug, c.id, Math.max(0, colorQtyVal - 1))}
                          className="h-7 w-7 rounded-lg hover:bg-soft flex items-center justify-center text-base leading-none"
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          value={colorQtyVal}
                          onChange={(e) => updateColorDraft(p.slug, c.id, Math.max(0, Number(e.target.value) || 0))}
                          className="w-12 text-center bg-transparent text-sm font-medium focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateColorDraft(p.slug, c.id, colorQtyVal + 1)}
                          className="h-7 w-7 rounded-lg hover:bg-soft flex items-center justify-center text-base leading-none"
                        >+</button>
                      </div>
                      <button
                        onClick={() => saveColor(p.slug, c.id)}
                        disabled={saving[colorKey]}
                        className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50"
                      >
                        {saving[colorKey] ? "..." : "حفظ"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
