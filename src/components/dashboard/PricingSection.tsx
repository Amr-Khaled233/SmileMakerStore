import { useEffect, useState, useCallback } from "react";
import { Tag, Trash2, Truck, Package } from "lucide-react";
import { api } from "@/lib/api";
import type { DynamicProduct, DynamicBundle, PromoCodeEntry } from "@/lib/api";
import { PRODUCTS, BUNDLES, formatEGP, effectivePrice } from "@/data/products";

function toDatetimeLocal(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PricingSection({ token }: { token: string }) {
  const [productDrafts, setProductDrafts] = useState<Record<string, { price: string; salePrice: string }>>({});
  const [dynProductDrafts, setDynProductDrafts] = useState<Record<string, { price: string; salePrice: string }>>({});
  const [dynProds, setDynProds] = useState<DynamicProduct[]>([]);
  const [bundleDrafts, setBundleDrafts] = useState<Record<string, string>>({});
  const [userBundles, setUserBundles] = useState<DynamicBundle[]>([]);
  const [userBundleDrafts, setUserBundleDrafts] = useState<Record<string, string>>({});
  const [promos, setPromos] = useState<PromoCodeEntry[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", pct: "", label: "" });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // Free shipping state
  const [fsFrom, setFsFrom] = useState("");
  const [fsTo, setFsTo] = useState("");
  const [fsActive, setFsActive] = useState(false);
  const [fsSaving, setFsSaving] = useState(false);

  const load = useCallback(async () => {
    const [data, dynBundles, dynProdsData] = await Promise.all([
      api.getPricing(token),
      api.getDynamicBundles().catch(() => [] as DynamicBundle[]),
      api.getDynamicProducts().catch(() => [] as DynamicProduct[]),
    ]);

    const pDrafts: Record<string, { price: string; salePrice: string }> = {};
    for (const p of PRODUCTS) {
      const ov = data.products.find((x) => x.slug === p.slug);
      pDrafts[p.slug] = {
        price: String(ov?.price ?? p.price),
        salePrice: ov?.salePrice != null ? String(ov.salePrice) : p.salePrice != null ? String(p.salePrice) : "",
      };
    }
    setProductDrafts(pDrafts);

    setDynProds(dynProdsData);
    const dpDrafts: Record<string, { price: string; salePrice: string }> = {};
    for (const p of dynProdsData) {
      dpDrafts[p.slug] = { price: String(p.price), salePrice: p.salePrice != null ? String(p.salePrice) : "" };
    }
    setDynProductDrafts(dpDrafts);

    const bDrafts: Record<string, string> = {};
    for (const b of BUNDLES) {
      const ov = data.bundles.find((x) => x.id === b.id);
      bDrafts[b.id] = ov !== undefined ? String(ov.price) : "";
    }
    setBundleDrafts(bDrafts);

    setUserBundles(dynBundles);
    const ubDrafts: Record<string, string> = {};
    for (const b of dynBundles) ubDrafts[b.id] = String(b.price);
    setUserBundleDrafts(ubDrafts);

    setPromos(data.promoCodes);

    // Load free shipping window — convert UTC ISO from server to local datetime-local format
    const fs = await api.getFreeShipping(token).catch(() => null);
    if (fs) {
      setFsFrom(toDatetimeLocal(fs.from));
      setFsTo(toDatetimeLocal(fs.to));
      const now = Date.now();
      setFsActive(new Date(fs.from).getTime() <= now && now <= new Date(fs.to).getTime());
    } else {
      setFsFrom("");
      setFsTo("");
      setFsActive(false);
    }

    setLoaded(true);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveProductPrice = async (slug: string) => {
    const draft = productDrafts[slug];
    const price = Number(draft?.price);
    const salePrice = draft?.salePrice.trim() ? Number(draft.salePrice) : null;
    if (isNaN(price) || price < 0) return;
    setSaving((s) => ({ ...s, [slug]: true }));
    await api.updateProductPrice(token, slug, price, salePrice);
    await load();
    setSaving((s) => ({ ...s, [slug]: false }));
  };

  const saveDynProductPrice = async (p: DynamicProduct) => {
    const draft = dynProductDrafts[p.slug];
    const price = Number(draft?.price);
    const salePrice = draft?.salePrice.trim() ? Number(draft.salePrice) : null;
    if (isNaN(price) || price < 0) return;
    setSaving((s) => ({ ...s, [`dyn_${p.slug}`]: true }));
    await api.updateProduct(token, p.id, { price, salePrice: salePrice ?? undefined });
    await load();
    setSaving((s) => ({ ...s, [`dyn_${p.slug}`]: false }));
  };

  const saveBundlePrice = async (id: string) => {
    const price = Number(bundleDrafts[id]);
    if (isNaN(price) || price < 0) return;
    setSaving((s) => ({ ...s, [id]: true }));
    await api.updateBundlePrice(token, id, price);
    await load();
    setSaving((s) => ({ ...s, [id]: false }));
  };

  const saveUserBundlePrice = async (id: string) => {
    const price = Number(userBundleDrafts[id]);
    if (isNaN(price) || price < 0) return;
    setSaving((s) => ({ ...s, [id]: true }));
    await api.updateDynamicBundle(token, id, { price });
    await load();
    setSaving((s) => ({ ...s, [id]: false }));
  };

  const deletePromo = async (code: string) => {
    if (!window.confirm(`حذف كود "${code}"؟`)) return;
    await api.deletePromoCode(token, code);
    await load();
  };

  const addPromo = async () => {
    const code = newPromo.code.trim().toUpperCase();
    const pct = Number(newPromo.pct);
    const label = newPromo.label.trim();
    if (!code || isNaN(pct) || pct <= 0 || pct > 100 || !label) return;
    await api.upsertPromoCode(token, code, pct, label);
    setNewPromo({ code: "", pct: "", label: "" });
    await load();
  };

  const saveFreeShipping = async () => {
    if (!fsFrom || !fsTo) return;
    setFsSaving(true);
    // Convert local datetime-local values to UTC ISO so the server compares correctly
    const fromUTC = new Date(fsFrom).toISOString();
    const toUTC = new Date(fsTo).toISOString();
    await api.setFreeShipping(token, fromUTC, toUTC).catch(() => {});
    await load();
    setFsSaving(false);
  };

  const clearFreeShipping = async () => {
    if (!window.confirm("إلغاء فترة الشحن المجاني؟")) return;
    setFsSaving(true);
    await api.clearFreeShipping(token).catch(() => {});
    await load();
    setFsSaving(false);
  };

  if (!loaded) {
    return <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-10">

      {/* Product Prices */}
      <section>
        <h3 className="font-display text-xl mb-1">أسعار المنتجات</h3>
        <p className="text-xs text-muted-foreground mb-4">اتركه فاضي أو اكتب 0 في سعر التخفيض لو ما فيش عرض.</p>
        <div className="space-y-4">
          {PRODUCTS.map((p) => {
            const draft = productDrafts[p.slug] ?? { price: String(p.price), salePrice: "" };
            return (
              <div key={p.slug} className="lux-card p-5">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-soft border border-border overflow-hidden shrink-0">
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink mb-3" dir="ltr">{p.title}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">السعر الأصلي (جنيه)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.price}
                          onChange={(e) =>
                            setProductDrafts((d) => ({ ...d, [p.slug]: { ...d[p.slug], price: e.target.value } }))
                          }
                          className="lux-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">سعر التخفيض (اتركه فاضي لو ما فيش)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.salePrice}
                          onChange={(e) =>
                            setProductDrafts((d) => ({ ...d, [p.slug]: { ...d[p.slug], salePrice: e.target.value } }))
                          }
                          className="lux-input text-sm"
                          placeholder="—"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => saveProductPrice(p.slug)}
                    disabled={saving[p.slug]}
                    className="btn-ghost text-xs py-2 px-4 disabled:opacity-50 shrink-0 mt-6"
                  >
                    {saving[p.slug] ? "..." : "حفظ"}
                  </button>
                </div>
              </div>
            );
          })}
          {dynProds.map((p) => {
            const draft = dynProductDrafts[p.slug] ?? { price: String(p.price), salePrice: "" };
            const savingKey = `dyn_${p.slug}`;
            return (
              <div key={p.slug} className="lux-card p-5">
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-xl bg-soft border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink mb-3" dir="ltr">{p.title}</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">السعر الأصلي (جنيه)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.price}
                          onChange={(e) =>
                            setDynProductDrafts((d) => ({ ...d, [p.slug]: { ...d[p.slug], price: e.target.value } }))
                          }
                          className="lux-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">سعر التخفيض (اتركه فاضي لو ما فيش)</label>
                        <input
                          type="number"
                          min={0}
                          value={draft.salePrice}
                          onChange={(e) =>
                            setDynProductDrafts((d) => ({ ...d, [p.slug]: { ...d[p.slug], salePrice: e.target.value } }))
                          }
                          className="lux-input text-sm"
                          placeholder="—"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => saveDynProductPrice(p)}
                    disabled={saving[savingKey]}
                    className="btn-ghost text-xs py-2 px-4 disabled:opacity-50 shrink-0 mt-6"
                  >
                    {saving[savingKey] ? "..." : "حفظ"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bundle Prices — all bundles unified */}
      <section>
        <h3 className="font-display text-xl mb-1">أسعار الباقات</h3>
        <p className="text-xs text-muted-foreground mb-4">سعر الباقة الكامل اللي بيدفعه العميل. الفرق بينه وبين مجموع المنتجات هو الخصم.</p>
        <div className="space-y-3">
          {/* Static/original bundles */}
          {BUNDLES.map((b) => {
            const itemsSum = b.items.reduce((s, slug) => {
              const p = PRODUCTS.find((x) => x.slug === slug)!;
              return s + effectivePrice(p);
            }, 0);
            const defaultPrice = Math.round(itemsSum * (1 - b.discountPct / 100));
            const inputVal = bundleDrafts[b.id];
            const currentPrice = inputVal !== "" ? Number(inputVal) : NaN;
            const savings = !isNaN(currentPrice) ? Math.max(0, itemsSum - currentPrice) : 0;
            const savingsPct = itemsSum > 0 && !isNaN(currentPrice) ? Math.round((savings / itemsSum) * 100) : 0;
            return (
              <div key={b.id} className="lux-card p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm">{b.title.ar}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>المجموع الأصلي: <span className="font-medium text-ink">{formatEGP(itemsSum)}</span></span>
                      {!isNaN(currentPrice) && savings > 0 && (
                        <span className="text-deep-blue font-medium">· وفر {formatEGP(savings)} ({savingsPct}%)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input type="number" min={0} value={inputVal} placeholder={String(defaultPrice)}
                      onChange={(e) => setBundleDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                      className="w-24 text-center lux-input text-sm" />
                    <span className="text-xs text-muted-foreground">جنيه</span>
                    <button onClick={() => saveBundlePrice(b.id)} disabled={saving[b.id]}
                      className="btn-ghost text-xs py-2 px-4 disabled:opacity-50">
                      {saving[b.id] ? "..." : "حفظ"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {/* User-created bundles — same style */}
          {userBundles.map((b) => {
            const itemsSum = b.items.reduce((s, slug) => {
              const sp = PRODUCTS.find((x) => x.slug === slug);
              if (sp) return s + effectivePrice(sp);
              const dp = dynProds.find((x) => x.slug === slug);
              if (dp) return s + (dp.salePrice ?? dp.price);
              return s;
            }, 0);
            const inputVal = userBundleDrafts[b.id] ?? "";
            const currentPrice = inputVal !== "" ? Number(inputVal) : NaN;
            const savings = !isNaN(currentPrice) ? Math.max(0, itemsSum - currentPrice) : 0;
            const savingsPct = itemsSum > 0 && !isNaN(currentPrice) ? Math.round((savings / itemsSum) * 100) : 0;
            return (
              <div key={b.id} className="lux-card p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink text-sm">{b.titleAr}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {itemsSum > 0 && <span>المجموع الأصلي: <span className="font-medium text-ink">{formatEGP(itemsSum)}</span></span>}
                      {!isNaN(currentPrice) && savings > 0 && (
                        <span className="text-deep-blue font-medium">· وفر {formatEGP(savings)} ({savingsPct}%)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input type="number" min={0} value={inputVal}
                      onChange={(e) => setUserBundleDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                      className="w-24 text-center lux-input text-sm" />
                    <span className="text-xs text-muted-foreground">جنيه</span>
                    <button onClick={() => saveUserBundlePrice(b.id)} disabled={saving[b.id]}
                      className="btn-ghost text-xs py-2 px-4 disabled:opacity-50">
                      {saving[b.id] ? "..." : "حفظ"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Promo Codes */}
      <section>
        <h3 className="font-display text-xl mb-1">أكواد الخصم</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {promos.length === 0
            ? "قاعدة البيانات فاضية — الأكواد الافتراضية (SMILE10، WELCOME5، SHINE15) شغالة دلوقتي. أضف كود هنا عشان تتحكم فيها."
            : "الأكواد دي هي اللي بتتقبل في صفحة الأوردر."}
        </p>

        <div className="space-y-2">
          {promos.map((promo) => (
            <div key={promo.code} className="lux-card p-3 flex items-center gap-3">
              <Tag className="h-3.5 w-3.5 text-deep-blue shrink-0" />
              <span className="font-mono text-sm font-bold text-deep-blue" dir="ltr">{promo.code}</span>
              <span className="text-sm font-medium text-ink">{promo.pct}%</span>
              <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{promo.label}</span>
              <button
                onClick={() => deletePromo(promo.code)}
                className="h-7 w-7 rounded-full border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new promo */}
        <div className="mt-4 lux-card p-4">
          <p className="text-sm font-medium text-ink mb-3">إضافة كود جديد</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الكود</label>
              <input
                type="text"
                value={newPromo.code}
                onChange={(e) => setNewPromo((n) => ({ ...n, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                placeholder="PROMO20"
                maxLength={20}
                className="lux-input text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نسبة الخصم %</label>
              <input
                type="number"
                min={1}
                max={100}
                value={newPromo.pct}
                onChange={(e) => setNewPromo((n) => ({ ...n, pct: e.target.value }))}
                placeholder="15"
                className="lux-input text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">الوصف</label>
              <input
                type="text"
                value={newPromo.label}
                onChange={(e) => setNewPromo((n) => ({ ...n, label: e.target.value }))}
                placeholder="خصم 15% على طلبك"
                maxLength={100}
                className="lux-input text-sm"
              />
            </div>
          </div>
          <button onClick={addPromo} className="mt-3 btn-ghost text-sm">
            + إضافة
          </button>
        </div>
      </section>

      {/* Free Shipping Window */}
      <section>
        <h3 className="font-display text-xl mb-1">شحن مجاني مؤقت</h3>
        <p className="text-xs text-muted-foreground mb-4">حدد الفترة الزمنية اللي يكون فيها الشحن مجاني لكل الأوردرات.</p>
        <div className="lux-card p-5 space-y-4">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${fsActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${fsActive ? "bg-emerald-500" : "bg-gray-400"}`} />
              {fsActive ? "الشحن المجاني شغال دلوقتي" : "الشحن المجاني مش شغال"}
            </span>
            {(fsFrom || fsTo) && (
              <span className="text-xs text-muted-foreground" dir="ltr">
                {fsFrom && new Date(fsFrom).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                {" → "}
                {fsTo && new Date(fsTo).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
          </div>

          {/* Date/time inputs */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">من (تاريخ ووقت البداية)</label>
              <input
                type="datetime-local"
                value={fsFrom}
                onChange={(e) => setFsFrom(e.target.value)}
                className="lux-input text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">إلى (تاريخ ووقت النهاية)</label>
              <input
                type="datetime-local"
                value={fsTo}
                onChange={(e) => setFsTo(e.target.value)}
                className="lux-input text-sm"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveFreeShipping}
              disabled={fsSaving || !fsFrom || !fsTo}
              className="btn-primary text-sm py-2 px-5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="h-3.5 w-3.5" />
              {fsSaving ? "جاري الحفظ..." : "حفظ الفترة"}
            </button>
            {(fsFrom || fsTo) && (
              <button
                onClick={clearFreeShipping}
                disabled={fsSaving}
                className="btn-ghost text-sm text-destructive border-red-200 hover:bg-red-50 py-2 px-4"
              >
                إلغاء الشحن المجاني
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
