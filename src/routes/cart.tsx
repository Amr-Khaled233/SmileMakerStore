import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Minus, Plus, Trash2, ShoppingCart, Sparkles, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import {
  useShopData,
  findProduct,
  findBundle,
  unitPrice,
  shopTitle,
  colorRemaining,
  productRemaining,
  cartToLines,
  bundleDiscountTotal,
  bundleItemQty,
  validateStock,
  type ShopData,
  type CartItem,
  type CartProductItem,
  type CartBundleItem,
} from "@/lib/shop";
import { formatEGP } from "@/data/products";
import type { ColorOption } from "@/data/products";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { t, lang } = useT();
  const nav = useNavigate();
  const cart = useCart();
  const data = useShopData();

  if (!data.ready) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-deep-blue border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (cart.items.length === 0) {
    return (
      <Layout>
        <section className="section-pad">
          <div className="container-lux max-w-xl text-center py-16">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-soft">
              <ShoppingCart className="h-7 w-7 text-muted-foreground" />
            </div>
            <h1 className="font-display text-3xl">{t("cart.empty")}</h1>
            <Link to="/products" className="btn-primary mt-6 inline-flex">{t("cart.emptyCta")}</Link>
          </div>
        </section>
      </Layout>
    );
  }

  const products = cart.items.filter((i): i is CartProductItem => i.type === "product");
  const bundles = cart.items.filter((i): i is CartBundleItem => i.type === "bundle");
  const subtotal = cartToLines(cart.items, data, "en").reduce((s, l) => s + l.lineTotal, 0);
  const bundleDiscount = bundleDiscountTotal(cart.items, data);
  const issues = validateStock(cart.items, data, lang);

  const goCheckout = () => {
    if (issues.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    nav({ to: "/checkout", search: { mode: "cart" } });
  };

  return (
    <Layout>
      <section className="section-pad">
        <div className="container-lux">
          <h1 className="font-display text-3xl sm:text-4xl mb-6">{t("cart.title")}</h1>

          {issues.length > 0 && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-destructive">
              <p className="font-medium mb-1">{t("checkout.fixErrors")}</p>
              <ul className="list-disc ms-5 space-y-0.5">{issues.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {products.map((it) => <ProductLine key={it.slug} item={it} data={data} />)}
              {bundles.map((it) => <BundleLine key={it.lineId} item={it} data={data} />)}
              <Link to="/products" className="inline-flex text-sm text-deep-blue hover:underline">← {t("cart.continueShopping")}</Link>
            </div>

            <aside>
              <div className="lux-card p-6 lg:sticky lg:top-24 space-y-4">
                <h2 className="font-display text-xl">{t("order.summary")}</h2>
                <div className="space-y-2 text-sm">
                  <Row label={t("order.subtotal")} value={formatEGP(subtotal, lang)} />
                  {bundleDiscount > 0 && <Row label={t("order.bundleDiscount")} value={`− ${formatEGP(bundleDiscount, lang)}`} accent />}
                  <p className="text-xs text-muted-foreground pt-1">{t("order.shippingAtCheckout")}</p>
                  <div className="border-t border-border pt-3 mt-1 flex items-center justify-between">
                    <span className="font-display text-lg">{t("order.total")}</span>
                    <span className="price-tag text-2xl text-gradient">{formatEGP(Math.max(0, subtotal - bundleDiscount), lang)}</span>
                  </div>
                </div>
                <button onClick={goCheckout} disabled={issues.length > 0} className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed">{t("cart.checkout")}</button>
                {issues.length > 0 && <p className="text-xs text-destructive text-center">{t("checkout.fixErrors")}</p>}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </Layout>
  );
}

// Swatch row: pick a colour for one slot; colours with no stock left disappear
// (unless they're the current selection).
function ColorPicker({
  colors,
  slug,
  data,
  items,
  selected,
  onPick,
}: {
  colors: ColorOption[];
  slug: string;
  data: ShopData;
  items: CartItem[];
  selected: string | undefined;
  onPick: (colorId: string) => void;
}) {
  const { tl, lang } = useT();
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {colors.map((c) => {
        const isSel = selected === c.id;
        const disabled = !isSel && colorRemaining(items, data, slug, c.id) <= 0;
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            title={disabled ? `${tl(c.label)} — ${lang === "ar" ? "نفد" : "out"}` : tl(c.label)}
            onClick={() => onPick(c.id)}
            className={`relative h-6 w-6 rounded-full border-2 transition-all ${isSel ? "border-deep-blue scale-110" : disabled ? "border-transparent opacity-40 cursor-not-allowed" : "border-transparent hover:border-deep-blue/40"}`}
            style={{ backgroundColor: c.hex }}
          >
            {disabled && <span className="absolute inset-0 flex items-center justify-center"><span className="absolute w-[130%] h-px bg-muted-foreground/70 rotate-45" /></span>}
            {isSel && <span className="absolute inset-0 flex items-center justify-center"><Check className="h-3 w-3 text-white drop-shadow" /></span>}
          </button>
        );
      })}
      {!selected && <span className="text-[10px] text-destructive">{lang === "ar" ? "اختر لون" : "Pick"}</span>}
    </div>
  );
}

function ProductLine({ item, data }: { item: CartProductItem; data: ShopData }) {
  const { t, lang } = useT();
  const cart = useCart();
  const p = findProduct(data, item.slug);

  if (!p) {
    return (
      <div className="lux-card p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{lang === "ar" ? "منتج لم يعد متاحاً" : "Product no longer available"}</span>
        <button onClick={() => cart.removeProduct(item.slug)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    );
  }

  const hasColors = (p.colors?.length ?? 0) > 0;
  const lineTotal = unitPrice(p) * item.qty;
  const anyColorLeft = (p.colors ?? []).some((c) => colorRemaining(cart.items, data, item.slug, c.id) > 0);

  return (
    <div className="lux-card p-4">
      <div className="flex items-start gap-4">
        <div className="h-20 w-20 rounded-xl bg-soft border border-border overflow-hidden shrink-0">
          {p.image && <img src={p.image} alt={p.title} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-ink" dir="ltr">{shopTitle(p, lang)}</p>
            <button onClick={() => cart.removeProduct(item.slug)} title={t("cart.remove")} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className="text-sm price-tag text-gradient mt-0.5">{formatEGP(unitPrice(p), lang)}</p>

          {/* Per-unit colours */}
          {hasColors && item.colors && (
            <div className="mt-3 space-y-2">
              {item.colors.map((cid, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground w-14">{lang === "ar" ? `قطعة ${idx + 1}` : `Unit ${idx + 1}`}</span>
                  <ColorPicker colors={p.colors!} slug={item.slug} data={data} items={cart.items} selected={cid || undefined} onPick={(c) => cart.setUnitColor(item.slug, idx, c)} />
                  <button onClick={() => cart.removeUnit(item.slug, idx)} className="text-red-300 hover:text-red-600 ms-auto" title={t("cart.remove")}><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Quantity */}
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            {hasColors ? (
              <button type="button" onClick={() => cart.appendUnit(item.slug)} disabled={!anyColorLeft} className="inline-flex items-center gap-1 text-xs text-deep-blue hover:underline disabled:opacity-40 disabled:no-underline">
                <Plus className="h-3.5 w-3.5" /> {lang === "ar" ? "أضف قطعة" : "Add unit"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-0.5">
                  <button type="button" onClick={() => cart.setProductQty(item.slug, item.qty - 1)} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                  <button type="button" onClick={() => cart.setProductQty(item.slug, item.qty + 1)} disabled={productRemaining(cart.items, data, item.slug) <= 0} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                {productRemaining(cart.items, data, item.slug) <= 0 && <span className="text-[11px] text-amber-600">{t("cart.onlyLeft").replace("{n}", String(item.qty))}</span>}
              </div>
            )}
            <span className="price-tag text-ink whitespace-nowrap">{formatEGP(lineTotal, lang)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BundleLine({ item, data }: { item: CartBundleItem; data: ShopData }) {
  const { t, tl, lang } = useT();
  const cart = useCart();
  const b = findBundle(data, item.bundleId);

  if (!b) {
    return (
      <div className="lux-card p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{lang === "ar" ? "باقة لم تعد متاحة" : "Bundle no longer available"}</span>
        <button onClick={() => cart.removeBundle(item.lineId)} className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
      </div>
    );
  }

  // Each product appears once; its per-bundle count comes from b.quantities.
  // A product with qty > 1 shares one colour selection per bundle instance.
  const grouped = b.items
    .map((s) => findProduct(data, s))
    .filter(Boolean)
    .map((p) => ({ p: p as NonNullable<typeof p>, qty: bundleItemQty(b, p!.slug) }));
  const itemsSum = grouped.reduce((s, { p, qty }) => s + unitPrice(p) * qty, 0);
  const perBundle = b.fixedPrice !== undefined ? b.fixedPrice : Math.round(itemsSum * (1 - b.discountPct / 100));
  const colorProducts = grouped.filter((g) => (g.p.colors?.length ?? 0) > 0);

  // Can we add one more bundle unit? Only if every product in it still has
  // at least one orderable unit left (a free colour, or non-colour stock).
  const canAddInstance = grouped.every(({ p }) =>
    (p.colors?.length ?? 0) > 0
      ? p.colors!.some((c) => colorRemaining(cart.items, data, p.slug, c.id) > 0)
      : productRemaining(cart.items, data, p.slug) > 0,
  );

  return (
    <div className="lux-card p-4 border-2 border-deep-blue/15">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-deep-blue" />
          <p className="font-display text-lg">{tl(b.title)}</p>
          <span className="text-[10px] bg-deep-blue/10 text-deep-blue rounded-full px-2 py-0.5">{t("cart.bundle")}</span>
        </div>
        <button onClick={() => cart.removeBundle(item.lineId)} title={t("cart.remove")} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="h-4 w-4" /></button>
      </div>

      <div className="mt-3 flex gap-2 flex-wrap">
        {grouped.map(({ p, qty }) => (
          <div key={p.slug} className="relative h-12 w-12 rounded-xl bg-soft border border-border overflow-hidden flex items-center justify-center">
            {p.image && <img src={p.image} alt={p.title} className="w-3/4 h-3/4 object-contain" />}
            {qty > 1 && <span className="absolute -top-1.5 -inset-e-1.5 min-w-4 h-4 px-1 rounded-full bg-deep-blue text-white text-[9px] font-semibold flex items-center justify-center">×{qty}</span>}
          </div>
        ))}
      </div>

      {/* One block per bundle instance */}
      {colorProducts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-3">
          {item.instances.map((inst, j) => (
            <div key={j} className={item.instances.length > 1 ? "rounded-xl border border-border/60 p-3 space-y-2" : "space-y-2"}>
              {item.instances.length > 1 && (
                <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <span className="inline-flex h-4 w-4 rounded-full bg-deep-blue text-white text-[10px] items-center justify-center">{j + 1}</span>
                  {lang === "ar" ? `الباقة ${j + 1}` : `Bundle ${j + 1}`}
                </p>
              )}
              {colorProducts.map(({ p, qty }) => (
                <div key={p.slug} className="space-y-1.5">
                  <span className="text-xs text-muted-foreground" dir="ltr">{shopTitle(p, lang)}{qty > 1 ? ` ×${qty}` : ""}</span>
                  {Array.from({ length: qty }).map((_, u) => (
                    <div key={u} className="flex items-center gap-2 flex-wrap">
                      {qty > 1 && <span className="text-[10px] text-muted-foreground w-12 shrink-0">{lang === "ar" ? `قطعة ${u + 1}` : `Unit ${u + 1}`}</span>}
                      <ColorPicker colors={p.colors!} slug={p.slug} data={data} items={cart.items} selected={inst[p.slug]?.[u] || undefined} onPick={(c) => cart.setBundleInstanceColor(item.lineId, j, p.slug, u, c)} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-0.5">
            <button type="button" onClick={() => cart.removeBundleInstance(item.lineId, item.instances.length - 1)} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-8 text-center text-sm font-medium">{item.instances.length}</span>
            <button type="button" onClick={() => cart.addBundleInstance(item.lineId)} disabled={!canAddInstance} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {!canAddInstance && <span className="text-[11px] text-amber-600">{lang === "ar" ? "نفد المخزون" : "Max stock"}</span>}
        </div>
        <span className="price-tag text-gradient whitespace-nowrap">{formatEGP(perBundle * item.instances.length, lang)}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`whitespace-nowrap ${accent ? "text-deep-blue font-medium" : "text-ink"}`}>{value}</span>
    </div>
  );
}
