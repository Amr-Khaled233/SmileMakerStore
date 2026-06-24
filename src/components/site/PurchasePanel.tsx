import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Check, Minus, Plus, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { useShopData, findProduct, colorRemaining, productRemaining, type CartItem } from "@/lib/shop";

// Add-to-cart + Buy-now controls for a single product.
// Colour products: pick a quantity per colour; a colour whose stock is fully
// used (out of stock, or already all in the cart) disappears automatically.
export function PurchasePanel({ slug }: { slug: string }) {
  const { t, tl, lang } = useT();
  const nav = useNavigate();
  const cart = useCart();
  const data = useShopData();

  // Colour products → per-colour counts; non-colour → single qty.
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!data.ready) return <div className="h-12 w-full rounded-xl bg-soft animate-pulse" />;
  const product = findProduct(data, slug);
  if (!product) return null;

  const hasColors = (product.colors?.length ?? 0) > 0;
  const oos = product.outOfStock;

  // ── Out of stock ──
  if (oos) {
    return <div className="btn-ghost opacity-60 cursor-not-allowed w-full justify-center">{t("cart.oos")}</div>;
  }

  const flash = () => { setAdded(true); setTimeout(() => setAdded(false), 1800); };

  // ── Non-colour product ──
  if (!hasColors) {
    const max = productRemaining(cart.items, data, slug); // stock minus what's already in cart
    const canAdd = qty <= max;
    const onAdd = () => { if (!canAdd) return; cart.addProduct(slug, undefined, qty); flash(); setQty(1); };
    const onBuy = () => { if (!canAdd) return; cart.setBuyNow([{ type: "product", slug, qty }]); nav({ to: "/checkout", search: { mode: "buynow" } }); };
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-ink">{t("cart.qty")}</span>
          <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-1">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30"><Minus className="h-4 w-4" /></button>
            <span className="w-10 text-center text-sm font-medium">{qty}</span>
            <button type="button" onClick={() => setQty((q) => (q < max ? q + 1 : q))} disabled={qty >= max} className="h-9 w-9 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30"><Plus className="h-4 w-4" /></button>
          </div>
          {Number.isFinite(max) && max <= 5 && <span className="text-xs text-amber-600">{t("cart.onlyLeft").replace("{n}", String(max))}</span>}
        </div>
        <Actions onAdd={onAdd} onBuy={onBuy} added={added} disabled={!canAdd} t={t} />
      </div>
    );
  }

  // ── Colour product: per-colour quantity, stock-aware ──
  const colorRows = product.colors!.map((c) => {
    const remaining = colorRemaining(cart.items, data, slug, c.id); // excludes current picks
    const pick = picks[c.id] ?? 0;
    return { c, remaining, pick };
  });
  const totalPick = colorRows.reduce((s, r) => s + r.pick, 0);
  const allGone = colorRows.every((r) => r.remaining <= 0 && r.pick <= 0);

  const setPick = (colorId: string, val: number) => setPicks((p) => ({ ...p, [colorId]: Math.max(0, val) }));

  const onAdd = () => {
    for (const { c, pick } of colorRows) if (pick > 0) cart.addProduct(slug, c.id, pick);
    setPicks({});
    flash();
  };
  const onBuy = () => {
    const colorsArr: string[] = [];
    for (const { c, pick } of colorRows) for (let i = 0; i < pick; i++) colorsArr.push(c.id);
    if (colorsArr.length === 0) return;
    const item: CartItem = { type: "product", slug, qty: colorsArr.length, colors: colorsArr };
    cart.setBuyNow([item]);
    nav({ to: "/checkout", search: { mode: "buynow" } });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-ink mb-2">
          {t("cart.color")}
          {totalPick === 0 && <span className="ms-2 text-xs text-destructive">{lang === "ar" ? "اختر لون وكمية" : "Pick a colour & qty"}</span>}
        </p>
        {allGone ? (
          <p className="text-sm text-muted-foreground">{t("cart.oos")}</p>
        ) : (
          <div className="space-y-2">
            {colorRows.map(({ c, remaining, pick }) => {
              const gone = remaining <= 0 && pick <= 0; // out of stock / fully allocated
              const atMax = pick >= remaining;
              return (
                <div key={c.id} className={`flex items-center justify-between gap-3 ${gone ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="relative h-5 w-5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }}>
                      {gone && <span className="absolute inset-0 flex items-center justify-center"><span className="absolute w-[130%] h-px bg-muted-foreground/70 rotate-45" /></span>}
                    </span>
                    <span className={`text-sm ${gone ? "text-muted-foreground line-through" : "text-ink"}`}>{tl(c.label)}</span>
                    {gone ? (
                      <span className="text-[11px] text-destructive">{lang === "ar" ? "نفد" : "out"}</span>
                    ) : Number.isFinite(remaining) && remaining <= 3 ? (
                      <span className="text-[11px] text-amber-600">{t("cart.onlyLeft").replace("{n}", String(remaining))}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 rounded-full border-2 border-border bg-white p-0.5 shrink-0">
                    <button type="button" onClick={() => setPick(c.id, pick - 1)} disabled={pick <= 0} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm font-medium">{pick}</span>
                    <button type="button" onClick={() => setPick(c.id, pick + 1)} disabled={atMax} className="h-7 w-7 rounded-full hover:bg-soft flex items-center justify-center disabled:opacity-30"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Actions onAdd={onAdd} onBuy={onBuy} added={added} disabled={totalPick === 0} t={t} />
    </div>
  );
}

function Actions({ onAdd, onBuy, added, disabled, t }: { onAdd: () => void; onBuy: () => void; added: boolean; disabled: boolean; t: (k: "btn.added" | "btn.addToCart" | "btn.buyNow") => string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button onClick={onAdd} disabled={disabled} className="btn-ghost flex-1 justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed">
        {added ? <><Check className="h-5 w-5" /> {t("btn.added")}</> : <><ShoppingCart className="h-5 w-5" /> {t("btn.addToCart")}</>}
      </button>
      <button onClick={onBuy} disabled={disabled} className="btn-primary flex-1 justify-center text-base disabled:opacity-50 disabled:cursor-not-allowed">
        <Zap className="h-5 w-5" /> {t("btn.buyNow")}
      </button>
    </div>
  );
}
