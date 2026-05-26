import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  LogOut,
  Package,
  RefreshCw,
  ChevronDown,
  Lock,
  Trash2,
  Search,
  GripVertical,
  Truck,
  Pencil,
  Tag,
} from "lucide-react";

type OrderStatus = "pending" | "dispatched" | "delivered";

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; badge: string; Icon: React.ElementType }> = {
  pending:    { label: "قيد الانتظار",   color: "amber",   badge: "bg-amber-50 text-amber-700 border-amber-200",      Icon: Clock },
  dispatched: { label: "خروج مع الشحن", color: "blue",    badge: "bg-blue-50 text-blue-700 border-blue-200",          Icon: Truck },
  delivered:  { label: "تم الاستلام",   color: "emerald", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
};

import { api, getToken, saveToken, clearToken } from "@/lib/api";
import type { Order, OrderItem, InventoryEntry, Pricing, PromoCodeEntry, DynamicProduct, DynamicBundle, BundleOverride, StaticProductOverride } from "@/lib/api";
import { PRODUCTS, BUNDLES, PRODUCT_DETAILS, formatEGP, effectivePrice, H2O_GALLERY, ORTHO_KIT_GALLERY, ELECTRIC_BRUSH_GALLERY, WAX_GALLERY, LSHAPED_GALLERY, type ProductSlug } from "@/data/products";

const PRODUCT_GALLERIES: Record<string, string[]> = {
  "h2o-water-flosser": H2O_GALLERY,
  "ortho-oral-kit": ORTHO_KIT_GALLERY,
  "electrical-dental-brush": ELECTRIC_BRUSH_GALLERY,
  "ortho-sheet": WAX_GALLERY,
  "l-shaped-interdental-brush": LSHAPED_GALLERY,
};

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

// ─── Login Screen ────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token } = await api.login(password);
      saveToken(token);
      onLogin(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-soft flex items-center justify-center p-4">
      <div className="lux-card p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-brand text-white items-center justify-center mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-display">Smile Maker</h1>
          <p className="text-sm text-muted-foreground mt-1">Manager Dashboard</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink block mb-2">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="lux-input"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className="lux-card p-5 flex items-start gap-4">
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${accent ? "bg-brand text-white" : "bg-soft border border-border text-deep-blue"}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl price-tag text-ink truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

function OrderCard({
  order,
  onStatusChange,
  onDelete,
  onEdit,
  isDragging,
}: {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, patch: {
    total?: number;
    notes?: string;
    items?: OrderItem[];
    subtotal?: number;
    bundleDiscount?: number;
    promoDiscount?: number;
    shippingFee?: number;
  }) => Promise<void>;
  isDragging?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTotal, setEditTotal] = useState(String(order.total));
  const [editNotes, setEditNotes] = useState(order.notes ?? "");
  const [editBundleDiscount, setEditBundleDiscount] = useState(String(order.bundleDiscount ?? 0));
  const [editPromoDiscount, setEditPromoDiscount] = useState(String(order.promoDiscount ?? 0));
  const [editShipping, setEditShipping] = useState(String(order.shippingFee ?? 0));
  const [editSaving, setEditSaving] = useState(false);
  const [editItems, setEditItems] = useState<Array<OrderItem & { unitPrice: number }>>([]);
  const computedSubtotal = editItems.reduce((s, item) => s + item.lineTotal, 0);

  const date = new Date(order.createdAt).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const status = order.status as OrderStatus;
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  const changeStatus = async (newStatus: OrderStatus) => {
    if (newStatus === status) return;
    setLoading(true);
    await onStatusChange(order.id, newStatus);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`حذف الأوردر ${order.id}؟\nسيتم إرجاع الكميات للمخزون تلقائياً.`)) return;
    setDeleting(true);
    await onDelete(order.id);
  };

  const openEdit = () => {
    setEditTotal(String(order.total));
    setEditNotes(order.notes ?? "");
    setEditBundleDiscount(String(order.bundleDiscount ?? 0));
    setEditPromoDiscount(String(order.promoDiscount ?? 0));
    setEditShipping(String(order.shippingFee ?? 0));
    setEditItems(order.items.map((item) => ({
      ...item,
      unitPrice: item.qty > 0 ? item.lineTotal / item.qty : 0,
    })));
    setEditMode(true);
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setEditItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: newQty, lineTotal: Math.round(newQty * item.unitPrice) } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!editMode) return;
    const subtotal = editItems.reduce((s, item) => s + item.lineTotal, 0);
    const bd = Number(editBundleDiscount) || 0;
    const pd = Number(editPromoDiscount) || 0;
    const sf = Number(editShipping) || 0;
    setEditTotal(String(Math.max(0, Math.round(subtotal - bd - pd + sf))));
  }, [editItems, editMode, editBundleDiscount, editPromoDiscount, editShipping]);

  const saveEdit = async () => {
    const total = Number(editTotal);
    if (isNaN(total) || total < 0) return;
    setEditSaving(true);
    const itemsToSave: OrderItem[] = editItems.map(({ unitPrice: _u, ...item }) => item);
    await onEdit(order.id, {
      items: itemsToSave,
      subtotal: computedSubtotal,
      bundleDiscount: Math.max(0, Number(editBundleDiscount) || 0),
      promoDiscount: Math.max(0, Number(editPromoDiscount) || 0),
      shippingFee: Math.max(0, Number(editShipping) || 0),
      total,
      notes: editNotes,
    });
    setEditMode(false);
    setEditSaving(false);
  };

  return (
    <div
      className={`lux-card p-4 transition-all select-none ${status === "delivered" ? "opacity-70" : ""} ${isDragging ? "ring-2 ring-deep-blue/30 scale-[0.97]" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" />
        <span className="font-medium text-ink text-sm" dir="ltr">{order.id}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border ${cfg.badge}`}>
          <cfg.Icon className="h-3 w-3" />
          {cfg.label}
        </span>
        <span className="text-[11px] text-muted-foreground ms-auto">{date}</span>
      </div>

      {/* Customer */}
      <div className="mt-3 flex items-start gap-4 text-sm">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-ink truncate">{order.name}</p>
          <p className="text-muted-foreground text-xs" dir="ltr">{order.phone}</p>
          <p className="text-muted-foreground text-xs truncate">{order.city} — {order.address}</p>
        </div>
      </div>

      {/* Actions row: status select + delete */}
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 flex-wrap">
        <select
          value={status}
          disabled={loading || deleting}
          onChange={(e) => changeStatus(e.target.value as OrderStatus)}
          className="flex-1 min-w-0 text-xs border border-border rounded-lg px-2 py-1.5 bg-white text-ink focus:outline-none focus:border-turquoise disabled:opacity-50 cursor-pointer"
        >
          <option value="pending">قيد الانتظار</option>
          <option value="dispatched">خروج مع الشحن</option>
          <option value="delivered">تم الاستلام</option>
        </select>
        {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
        <button
          onClick={openEdit}
          disabled={editMode || deleting}
          title="تعديل الإجمالي أو الملاحظات"
          className="h-8 w-8 rounded-full border border-border text-muted-foreground hover:bg-soft hover:text-ink flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting || loading}
          title="إلغاء وحذف الأوردر"
          className="h-8 w-8 rounded-full border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
        >
          {deleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Items */}
      <div className="mt-3 border-t border-border pt-3 space-y-1">
        {editMode ? (
          <div className="space-y-2">
            {editItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-ink flex-1 min-w-0 truncate" dir="ltr">{item.title}</span>
                <div className="flex items-center border border-border rounded-lg overflow-hidden shrink-0">
                  <button type="button" onClick={() => updateItemQty(i, item.qty - 1)} disabled={item.qty <= 1} className="px-2 py-1 text-sm hover:bg-soft disabled:opacity-30">−</button>
                  <span className="w-7 text-center text-xs font-medium">{item.qty}</span>
                  <button type="button" onClick={() => updateItemQty(i, item.qty + 1)} className="px-2 py-1 text-sm hover:bg-soft">+</button>
                </div>
                <span className="price-tag text-xs w-14 text-left shrink-0">{formatEGP(item.lineTotal)}</span>
                <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {editItems.length === 0 && <p className="text-xs text-muted-foreground">لا يوجد منتجات</p>}
          </div>
        ) : (
          <>
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-ink truncate" dir="ltr">
                  {item.title} <span className="text-muted-foreground">× {item.qty}</span>
                </span>
                <span className="price-tag text-ink whitespace-nowrap">{formatEGP(item.lineTotal)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-dashed border-border mt-1">
              <span className="text-[11px] text-muted-foreground">
                {order.bundleDiscount > 0 && `خصم: −${formatEGP(order.bundleDiscount)} · `}
                {order.promoDiscount > 0 && `كود: −${formatEGP(order.promoDiscount)} · `}
                شحن: {formatEGP(order.shippingFee)}
              </span>
              <span className="price-tag text-sm text-gradient">{formatEGP(order.total)} EGP</span>
            </div>
          </>
        )}
      </div>

      {order.notes && !editMode && (
        <p className="mt-2 text-[11px] text-muted-foreground bg-soft rounded-lg px-3 py-1.5">
          📝 {order.notes}
        </p>
      )}

      {/* Inline edit form */}
      {editMode && (
        <div className="mt-3 border-t border-border pt-3 space-y-2">
          {/* Summary — all fields editable */}
          <div className="text-xs space-y-1.5 bg-soft rounded-xl px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0">الإجمالي الفرعي</span>
              <span className="price-tag text-ink text-xs">{formatEGP(computedSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0">خصم الباقة −</span>
              <input
                type="number" min={0} value={editBundleDiscount}
                onChange={(e) => setEditBundleDiscount(e.target.value)}
                className="w-24 text-end text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-turquoise"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0">خصم الكود −</span>
              <input
                type="number" min={0} value={editPromoDiscount}
                onChange={(e) => setEditPromoDiscount(e.target.value)}
                className="w-24 text-end text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-turquoise"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0">الشحن</span>
              <input
                type="number" min={0} value={editShipping}
                onChange={(e) => setEditShipping(e.target.value)}
                className="w-24 text-end text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-turquoise"
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/60">
              <span className="text-ink font-medium shrink-0">الإجمالي</span>
              <input
                type="number" min={0} value={editTotal}
                onChange={(e) => setEditTotal(e.target.value)}
                className="w-24 text-end text-sm font-semibold border border-deep-blue/40 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-deep-blue"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">ملاحظات:</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full mt-1 lux-input text-xs resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={editSaving}
              className="btn-ghost text-xs py-1.5 px-4 disabled:opacity-50"
            >
              {editSaving ? "..." : "حفظ"}
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="text-xs text-muted-foreground hover:text-ink px-3 py-1.5 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inventory Section ───────────────────────────────────────────────────────

function InventorySection({ token }: { token: string }) {
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [draftQty, setDraftQty] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const data = await api.getInventory(token);
    setInventory(data);
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
    const product = PRODUCTS.find((p) => p.slug === slug);
    const colorKey = `${slug}__${colorId}`;
    setDraftQty((d) => {
      const next = { ...d, [colorKey]: newVal };
      if (product?.colors) {
        const total = product.colors.reduce((sum, c) => {
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
    const product = PRODUCTS.find((p) => p.slug === slug);
    if (product?.colors) {
      const total = product.colors.reduce((sum, c) => sum + (draftQty[`${slug}__${c.id}`] ?? 0), 0);
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
    </div>
  );
}

// ─── Pricing Section ─────────────────────────────────────────────────────────

function toDatetimeLocal(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PricingSection({ token }: { token: string }) {
  const [productDrafts, setProductDrafts] = useState<Record<string, { price: string; salePrice: string }>>({});
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
    const [data, dynBundles] = await Promise.all([
      api.getPricing(token),
      api.getDynamicBundles().catch(() => [] as DynamicBundle[]),
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
        </div>
      </section>

      {/* Bundle Prices */}
      <section>
        <h3 className="font-display text-xl mb-1">أسعار الباقات</h3>
        <p className="text-xs text-muted-foreground mb-4">سعر الباقة الكامل اللي بيدفعه العميل. الفرق بينه وبين مجموع المنتجات هو الخصم.</p>
        <div className="space-y-3">
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
                    <input
                      type="number"
                      min={0}
                      value={inputVal}
                      placeholder={String(defaultPrice)}
                      onChange={(e) => setBundleDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                      className="w-24 text-center lux-input text-sm"
                    />
                    <span className="text-xs text-muted-foreground">جنيه</span>
                    <button
                      onClick={() => saveBundlePrice(b.id)}
                      disabled={saving[b.id]}
                      className="btn-ghost text-xs py-2 px-4 disabled:opacity-50"
                    >
                      {saving[b.id] ? "..." : "حفظ"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* User-created Bundle Prices */}
      {userBundles.length > 0 && (
      <section>
        <h3 className="font-display text-xl mb-1">أسعار الباقات المضافة</h3>
        <p className="text-xs text-muted-foreground mb-4">السعر المباشر للباقات اللي أضفتها.</p>
        <div className="space-y-3">
          {userBundles.map((b) => (
            <div key={b.id} className="lux-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink text-sm">{b.titleAr}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{b.items.length} منتجات</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    value={userBundleDrafts[b.id] ?? ""}
                    onChange={(e) => setUserBundleDrafts((d) => ({ ...d, [b.id]: e.target.value }))}
                    className="w-24 text-center lux-input text-sm"
                  />
                  <span className="text-xs text-muted-foreground">جنيه</span>
                  <button
                    onClick={() => saveUserBundlePrice(b.id)}
                    disabled={saving[b.id]}
                    className="btn-ghost text-xs py-2 px-4 disabled:opacity-50"
                  >
                    {saving[b.id] ? "..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

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

// ─── Analytics Section ───────────────────────────────────────────────────────

const CHART_GRADIENTS = [
  "from-turquoise to-deep-blue",
  "from-deep-blue to-violet-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
];

function AnalyticsSection({ orders }: { orders: Order[] }) {
  const deliveredOrders = useMemo(
    () => orders.filter((o) => o.status === "delivered"),
    [orders]
  );

  const productStats = useMemo(() => {
    const map = new Map<string, { title: string; units: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const ex = map.get(item.slug) ?? { title: item.title, units: 0, revenue: 0 };
        map.set(item.slug, { title: item.title, units: ex.units + item.qty, revenue: ex.revenue + item.lineTotal });
      }
    }
    return [...map.values()].sort((a, b) => b.units - a.units);
  }, [orders]);

  const cityStats = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const ex = map.get(o.city) ?? { orders: 0, revenue: 0 };
      map.set(o.city, { orders: ex.orders + 1, revenue: ex.revenue + o.total });
    }
    return [...map.entries()]
      .map(([city, s]) => ({ city, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [orders]);

  const maxUnits = productStats[0]?.units ?? 1;
  const maxCityRevenue = cityStats[0]?.revenue ?? 1;
  const deliveredRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const avgOrder = deliveredOrders.length > 0 ? Math.round(deliveredRevenue / deliveredOrders.length) : 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="أوردرات مُسلَّمة"  value={deliveredOrders.length} icon={CheckCircle2} />
        <StatCard label="إيرادات مؤكدة"    value={deliveredOrders.length ? formatEGP(deliveredRevenue) : "—"} icon={TrendingUp} accent />
        <StatCard label="متوسط الأوردر"    value={avgOrder ? formatEGP(avgOrder) : "—"} icon={Tag} />
        <StatCard label="أكثر مدينة طلباً" value={cityStats[0]?.city ?? "—"} sub={cityStats[0] ? `${cityStats[0].orders} أوردر` : undefined} icon={Package} />
      </div>

      {/* Product demand chart */}
      <div className="lux-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-deep-blue" />
          <h3 className="font-display text-xl">أكثر المنتجات طلباً</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">من جميع الأوردرات — قيد الانتظار + الشحن + المُسلَّمة</p>
        {productStats.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">لا يوجد أوردرات بعد</p>
        ) : (
          <div className="space-y-4">
            {productStats.map((p, i) => (
              <div key={p.title}>
                <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-6 shrink-0 text-center">#{i + 1}</span>
                    <span className="text-sm font-medium text-ink truncate" dir="ltr">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <span className="font-semibold text-ink">{p.units} وحدة</span>
                    <span className="text-muted-foreground">{formatEGP(p.revenue)}</span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-soft overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${CHART_GRADIENTS[i % CHART_GRADIENTS.length]}`}
                    style={{ width: `${Math.max(4, Math.round((p.units / maxUnits) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* City distribution */}
      {cityStats.length > 0 && (
        <div className="lux-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-5 w-5 text-deep-blue" />
            <h3 className="font-display text-xl">التوزيع الجغرافي</h3>
            <span className="text-xs text-muted-foreground ms-auto">مرتبة حسب الإيرادات</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">من جميع الأوردرات</p>
          <div className="space-y-4">
            {cityStats.map((c, i) => (
              <div key={c.city}>
                <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground w-6 shrink-0 text-center">#{i + 1}</span>
                    <span className="text-sm font-medium text-ink">{c.city}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <span className="font-semibold text-ink">{formatEGP(c.revenue)}</span>
                    <span className="text-muted-foreground">{c.orders} أوردر · {Math.round((c.orders / orders.length) * 100)}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-soft overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${CHART_GRADIENTS[i % CHART_GRADIENTS.length]}`}
                    style={{ width: `${Math.max(4, Math.round((c.revenue / maxCityRevenue) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sales Section ────────────────────────────────────────────────────────────

function SalesSection({ orders }: { orders: Order[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const monthlyStats = useMemo(() => {
    const map = new Map<string, { label: string; count: number; revenue: number; list: Order[] }>();
    for (const o of orders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("ar-EG", { year: "numeric", month: "long" });
      const ex = map.get(key) ?? { label, count: 0, revenue: 0, list: [] };
      map.set(key, { label, count: ex.count + 1, revenue: ex.revenue + o.total, list: [...ex.list, o] });
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([key, v]) => ({ key, ...v }));
  }, [orders]);

  useEffect(() => {
    if (monthlyStats.length > 0 && !selectedKey) setSelectedKey(monthlyStats[0].key);
  }, [monthlyStats, selectedKey]);

  const selectedMonth = monthlyStats.find((m) => m.key === selectedKey) ?? null;
  const maxRevenue = monthlyStats[0]?.revenue ?? 1;

  const productBreakdown = useMemo(() => {
    if (!selectedMonth) return [];
    const map = new Map<string, { title: string; units: number; revenue: number }>();
    for (const o of selectedMonth.list) {
      for (const item of o.items ?? []) {
        const ex = map.get(item.slug) ?? { title: item.title, units: 0, revenue: 0 };
        map.set(item.slug, { title: item.title, units: ex.units + item.qty, revenue: ex.revenue + item.lineTotal });
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [selectedMonth]);

  const maxProductRevenue = productBreakdown[0]?.revenue ?? 1;

  if (orders.length === 0) {
    return <p className="text-center py-16 text-muted-foreground">لا يوجد أوردرات بعد</p>;
  }

  return (
    <div className="space-y-6">
      {/* Monthly overview — clickable rows */}
      <div className="lux-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-deep-blue" />
          <h3 className="font-display text-xl">المبيعات الشهرية</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">اضغط على شهر لعرض تفاصيل منتجاته</p>
        <div className="space-y-2">
          {monthlyStats.map((m, i) => {
            const isSelected = selectedKey === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedKey(m.key)}
                className={`w-full text-start rounded-xl px-3 py-2.5 transition-all ${
                  isSelected
                    ? "bg-deep-blue/8 ring-2 ring-deep-blue/25"
                    : "hover:bg-soft"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">#{i + 1}</span>
                    <span className={`text-sm font-semibold ${isSelected ? "text-deep-blue" : "text-ink"}`}>{m.label}</span>
                    {isSelected && (
                      <span className="text-[10px] bg-deep-blue text-white rounded-full px-2 py-0.5 font-medium">محدد</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <span className={`font-bold ${isSelected ? "text-deep-blue" : "text-ink"}`}>{formatEGP(m.revenue)}</span>
                    <span className="text-muted-foreground">{m.count} أوردر</span>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-soft overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all ${
                      isSelected
                        ? "from-deep-blue to-turquoise"
                        : CHART_GRADIENTS[i % CHART_GRADIENTS.length]
                    }`}
                    style={{ width: `${Math.max(4, Math.round((m.revenue / maxRevenue) * 100))}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Product breakdown for selected month */}
      {selectedMonth && (
        <div className="lux-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-5 w-5 text-deep-blue" />
            <h3 className="font-display text-xl">تفاصيل {selectedMonth.label}</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            {selectedMonth.count} أوردر · إجمالي {formatEGP(selectedMonth.revenue)}
          </p>
          {productBreakdown.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">لا توجد بيانات منتجات لهذا الشهر</p>
          ) : (
            <div className="space-y-4">
              {productBreakdown.map((p, i) => (
                <div key={p.title}>
                  <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-6 shrink-0 text-center">#{i + 1}</span>
                      <span className="text-sm font-medium text-ink truncate" dir="ltr">{p.title}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <span className="font-semibold text-ink">{formatEGP(p.revenue)}</span>
                      <span className="text-muted-foreground">{p.units} وحدة</span>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-soft overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${CHART_GRADIENTS[i % CHART_GRADIENTS.length]}`}
                      style={{ width: `${Math.max(4, Math.round((p.revenue / maxProductRevenue) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Delivered Section ────────────────────────────────────────────────────────

function DeliveredSection({ orders, onDelete }: { orders: Order[]; onDelete: (id: string) => Promise<void> }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deliveredSearch, setDeliveredSearch] = useState("");

  const deliveredOrders = useMemo(
    () => [...orders].filter((o) => o.status === "delivered").sort((a, b) => b.createdAt - a.createdAt),
    [orders]
  );

  const filteredDelivered = useMemo(() => {
    const q = deliveredSearch.trim();
    if (!q) return deliveredOrders;
    return deliveredOrders.filter(
      (o) =>
        o.phone.includes(q) ||
        o.name.includes(q) ||
        o.id.toLowerCase().includes(q.toLowerCase()) ||
        o.city.includes(q)
    );
  }, [deliveredOrders, deliveredSearch]);

  const handleDeleteDelivered = async (id: string) => {
    if (!window.confirm("حذف الأوردر؟ سيتم إرجاع الكميات للمخزون تلقائياً.")) return;
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    if (expandedId === id) setExpandedId(null);
  };

  const deliveredRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="عدد الأوردرات المُسلَّمة"   value={deliveredOrders.length}                                                   icon={CheckCircle2} />
        <StatCard label="إجمالي الإيرادات المؤكدة"   value={deliveredOrders.length ? formatEGP(deliveredRevenue) : "—"}               icon={TrendingUp} accent />
        <StatCard label="متوسط قيمة الأوردر"          value={deliveredOrders.length ? formatEGP(Math.round(deliveredRevenue / deliveredOrders.length)) : "—"} icon={Tag} />
      </div>

      {/* Search + list */}
      <div className="lux-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="font-display text-xl">الأوردرات المُسلَّمة</h3>
          <span className="ms-auto text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
            {deliveredOrders.length}
          </span>
        </div>
        {deliveredOrders.length > 0 && (
          <div className="relative mb-4">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="ابحث برقم التليفون أو الاسم أو المدينة أو ID..."
              value={deliveredSearch}
              onChange={(e) => setDeliveredSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background pe-10 ps-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-deep-blue/30"
            />
          </div>
        )}
        {deliveredOrders.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">
            لا يوجد أوردرات مُسلَّمة بعد — غيّر الحالة من داخل الأوردر لـ "تم الاستلام"
          </p>
        ) : filteredDelivered.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">لا توجد نتائج لـ "{deliveredSearch}"</p>
        ) : (
          <div className="divide-y divide-border">
            {filteredDelivered.map((o) => {
              const isExpanded = expandedId === o.id;
              const isDeleting = deletingId === o.id;
              return (
                <div key={o.id} className={`transition-colors ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : o.id)}
                    className="w-full text-start py-3 flex items-center gap-3 hover:bg-soft/50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink text-xs" dir="ltr">{o.id}</span>
                        <span className="font-medium text-ink text-sm">{o.name}</span>
                        <span className="text-xs text-muted-foreground">{o.city}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {(o.items ?? []).map((it) => `${it.title} ×${it.qty}`).join(" · ")}
                      </p>
                    </div>
                    <div className="text-end shrink-0 me-1">
                      <p className="price-tag text-sm text-deep-blue">{formatEGP(o.total)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {isExpanded && (
                    <div className="pb-4 px-2 space-y-3 text-sm">
                      <div className="bg-soft rounded-xl px-4 py-3 space-y-1 text-xs">
                        <p className="flex items-center gap-2">
                          <span className="text-muted-foreground">📞</span>
                          <span dir="ltr" className="text-ink font-medium">{o.phone}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="text-muted-foreground">📍</span>
                          <span className="text-ink">{o.city} — {o.address}</span>
                        </p>
                        {o.notes && (
                          <p className="flex items-start gap-2">
                            <span className="text-muted-foreground mt-0.5">📝</span>
                            <span className="text-ink">{o.notes}</span>
                          </p>
                        )}
                      </div>
                      <div className="grid text-xs gap-y-1" style={{ gridTemplateColumns: "1fr auto auto" }}>
                        {(o.items ?? []).map((it, idx) => (
                          <>
                            <span key={`t${idx}`} className="text-ink truncate pe-2" dir="ltr">{it.title}</span>
                            <span key={`q${idx}`} className="text-muted-foreground text-center px-2">×{it.qty}</span>
                            <span key={`p${idx}`} className="price-tag text-ink tabular-nums text-start">{formatEGP(it.lineTotal)}</span>
                          </>
                        ))}
                      </div>
                      <div className="border-t border-dashed border-border pt-2 space-y-1 text-xs text-muted-foreground">
                        {o.subtotal > 0 && o.subtotal !== o.total && (
                          <div className="flex justify-between"><span>فرعي</span><span>{formatEGP(o.subtotal)}</span></div>
                        )}
                        {o.bundleDiscount > 0 && (
                          <div className="flex justify-between text-deep-blue"><span>خصم الباقة</span><span>−{formatEGP(o.bundleDiscount)}</span></div>
                        )}
                        {o.promoDiscount > 0 && (
                          <div className="flex justify-between text-deep-blue"><span>كود الخصم</span><span>−{formatEGP(o.promoDiscount)}</span></div>
                        )}
                        <div className="flex justify-between"><span>الشحن</span><span>{formatEGP(o.shippingFee)}</span></div>
                        <div className="flex justify-between font-semibold text-ink text-sm pt-1 border-t border-border">
                          <span>الإجمالي</span>
                          <span className="price-tag text-gradient">{formatEGP(o.total)}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDelivered(o.id); }}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        حذف الأوردر
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Products Management Section ─────────────────────────────────────────────

function ProductsSection({ token }: { token: string }) {
  const [subTab, setSubTab] = useState<"dynamic" | "static" | "bundles">("dynamic");

  // Dynamic products
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [form, setForm] = useState({
    title: "", titleAr: "", slug: "", price: "", salePrice: "",
    description: "", descriptionAr: "",
    features: [] as { en: string; ar: string }[],
    colors: [] as { id: string; label: { en: string; ar: string }; hex: string }[],
  });
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [primaryUploadingFor, setPrimaryUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const pendingProductId = useRef<string | null>(null);

  // Static products
  const [imageOverrides, setImageOverrides] = useState<Record<string, string[]>>({});
  const [hiddenSlugs, setHiddenSlugs] = useState<string[]>([]);
  const [staticUploadingFor, setStaticUploadingFor] = useState<string | null>(null);
  const [staticSettingPrimary, setStaticSettingPrimary] = useState<string | null>(null);
  const staticReplacingIdx = useRef<{ slug: string; idx: number } | null>(null);
  const [togglingHidden, setTogglingHidden] = useState<string | null>(null);
  const staticFileInputRef = useRef<HTMLInputElement>(null);
  const staticReplaceFileInputRef = useRef<HTMLInputElement>(null);
  const pendingStaticSlug = useRef<string | null>(null);

  // Static product pricing overrides + text overrides
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, { price: number; salePrice?: number | null }>>({});
  const [staticOverrides, setStaticOverrides] = useState<Record<string, StaticProductOverride>>({});
  const [editingStaticSlug, setEditingStaticSlug] = useState<string | null>(null);
  const [staticEditForm, setStaticEditForm] = useState({
    description: "", descriptionAr: "",
    taglineEn: "", taglineAr: "",
    features: [] as { en: string; ar: string }[],
    colors: [] as { id: string; label: { en: string; ar: string }; hex: string }[],
    related: [] as string[],
  });
  const [savingStaticDetails, setSavingStaticDetails] = useState(false);

  // Hardcoded bundle overrides
  const [bundleOverrides, setBundleOverrides] = useState<Record<string, BundleOverride>>({});
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [bundleForm, setBundleForm] = useState({ titleEn: "", titleAr: "", taglineEn: "", taglineAr: "", items: [] as string[], discountPct: "10" });
  const [savingBundle, setSavingBundle] = useState(false);

  // User-created bundles
  const [userBundles, setUserBundles] = useState<DynamicBundle[]>([]);
  const EMPTY_BUNDLE_FORM = { titleEn: "", titleAr: "", taglineEn: "", taglineAr: "", items: [] as string[], price: "" };
  const [newBundleForm, setNewBundleForm] = useState(EMPTY_BUNDLE_FORM);
  const [creatingBundle, setCreatingBundle] = useState(false);
  const [editingUserBundleId, setEditingUserBundleId] = useState<string | null>(null);
  const [editUserBundleForm, setEditUserBundleForm] = useState(EMPTY_BUNDLE_FORM);
  const [savingUserBundle, setSavingUserBundle] = useState(false);

  const load = useCallback(async () => {
    const [data, meta, pricing, dynBundles] = await Promise.all([
      api.getDynamicProducts().catch(() => [] as DynamicProduct[]),
      api.getProductsMeta().catch(() => ({ imageOverrides: {} as Record<string, string[]>, hidden: [] as string[], staticOverrides: {} as Record<string, StaticProductOverride>, bundleOverrides: {} as Record<string, BundleOverride> })),
      api.getPricing(token).catch(() => null as Pricing | null),
      api.getDynamicBundles().catch(() => [] as DynamicBundle[]),
    ]);
    setProducts(data);
    setImageOverrides(meta.imageOverrides);
    setHiddenSlugs(meta.hidden);
    setStaticOverrides(meta.staticOverrides ?? {});
    setBundleOverrides(meta.bundleOverrides ?? {});
    setUserBundles(dynBundles);
    if (pricing) {
      const ovMap: Record<string, { price: number; salePrice?: number | null }> = {};
      for (const ov of pricing.products) {
        if (ov.price !== undefined) ovMap[ov.slug] = { price: ov.price, salePrice: ov.salePrice };
      }
      setPricingOverrides(ovMap);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // ── Dynamic handlers ──
  const addProduct = async () => {
    const price = Number(form.price);
    const salePrice = form.salePrice.trim() ? Number(form.salePrice) : undefined;
    if (!form.title.trim() || !form.titleAr.trim() || !form.slug.trim() || isNaN(price) || price <= 0) return;
    setSaving(true);
    try {
      await api.createProduct(token, {
        title: form.title.trim(),
        titleAr: form.titleAr.trim(),
        slug: slugify(form.slug),
        price,
        salePrice: salePrice && salePrice > 0 ? salePrice : undefined,
        description: form.description.trim() || undefined,
        descriptionAr: form.descriptionAr.trim() || undefined,
        features: form.features.filter((f) => f.en.trim() || f.ar.trim()),
        colors: form.colors.filter((c) => c.label.en.trim() || c.label.ar.trim()),
      });
      setForm({ title: "", titleAr: "", slug: "", price: "", salePrice: "", description: "", descriptionAr: "", features: [], colors: [] });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm("حذف المنتج؟ لن يمكن التراجع.")) return;
    await api.deleteProduct(token, id);
    setProducts((p) => p.filter((x) => x.id !== id));
  };

  const openImagePicker = (id: string) => { pendingProductId.current = id; fileInputRef.current?.click(); };
  const openPrimaryImagePicker = (id: string) => { pendingProductId.current = id; primaryFileInputRef.current?.click(); };
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const id = pendingProductId.current;
    if (!file || !id) return; e.target.value = ""; setUploadingFor(id);
    const reader = new FileReader();
    reader.onload = async (ev) => { await api.addProductImage(token, id, ev.target?.result as string).catch(() => {}); await load(); setUploadingFor(null); };
    reader.readAsDataURL(file);
  };
  const onPrimaryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const id = pendingProductId.current;
    if (!file || !id) return; e.target.value = ""; setPrimaryUploadingFor(id);
    const reader = new FileReader();
    reader.onload = async (ev) => { await api.setProductPrimaryImage(token, id, ev.target?.result as string).catch(() => {}); await load(); setPrimaryUploadingFor(null); };
    reader.readAsDataURL(file);
  };
  const removeImage = async (id: string, idx: number) => {
    await api.removeProductImage(token, id, idx);
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, images: p.images.filter((_, i) => i !== idx) } : p));
  };

  const addFeature = () => setForm((f) => ({ ...f, features: [...f.features, { en: "", ar: "" }] }));
  const removeFeature = (i: number) => setForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, key: "en" | "ar", val: string) =>
    setForm((f) => ({ ...f, features: f.features.map((feat, idx) => idx === i ? { ...feat, [key]: val } : feat) }));

  const addColor = () => setForm((f) => ({ ...f, colors: [...f.colors, { id: `c${Date.now()}`, label: { en: "", ar: "" }, hex: "#4B9CD3" }] }));
  const removeColor = (i: number) => setForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  const updateColorLabel = (i: number, key: "en" | "ar", val: string) =>
    setForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, label: { ...c.label, [key]: val } } : c) }));
  const updateColorHex = (i: number, val: string) =>
    setForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, hex: val } : c) }));

  // ── Static handlers ──
  const openStaticImagePicker = (slug: string) => { pendingStaticSlug.current = slug; staticFileInputRef.current?.click(); };
  const onStaticFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const slug = pendingStaticSlug.current;
    if (!file || !slug) return; e.target.value = ""; setStaticUploadingFor(slug);
    const reader = new FileReader();
    reader.onload = async (ev) => { await api.addStaticProductImage(token, slug, ev.target?.result as string).catch(() => {}); await load(); setStaticUploadingFor(null); };
    reader.readAsDataURL(file);
  };

  // Get effective image list for a slug (custom if exists, else originals)
  const getEffectiveImages = (slug: string) => imageOverrides[slug]?.length ? imageOverrides[slug] : (PRODUCT_GALLERIES[slug] ?? []);

  const removeStaticImage = async (slug: string, idx: number) => {
    if (!window.confirm("حذف الصورة؟ لن يمكن التراجع.")) return;
    const imgs = getEffectiveImages(slug);
    const newImgs = imgs.filter((_, i) => i !== idx);
    await api.setStaticProductImages(token, slug, newImgs).catch(() => {});
    if (newImgs.length === 0) setImageOverrides((prev) => { const next = { ...prev }; delete next[slug]; return next; });
    else setImageOverrides((prev) => ({ ...prev, [slug]: newImgs }));
  };
  const setStaticImagePrimary = async (slug: string, idx: number) => {
    if (idx === 0) return;
    setStaticSettingPrimary(`${slug}:${idx}`);
    const imgs = getEffectiveImages(slug);
    const newImgs = [...imgs];
    const [img] = newImgs.splice(idx, 1);
    newImgs.unshift(img);
    await api.setStaticProductImages(token, slug, newImgs).catch(() => {});
    await load();
    setStaticSettingPrimary(null);
  };
  const openStaticReplaceImagePicker = (slug: string, idx: number) => {
    staticReplacingIdx.current = { slug, idx };
    staticReplaceFileInputRef.current?.click();
  };
  const onStaticReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const info = staticReplacingIdx.current;
    if (!file || !info) return; e.target.value = ""; setStaticUploadingFor(`${info.slug}:${info.idx}`);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const newImage = ev.target?.result as string;
      const imgs = getEffectiveImages(info.slug);
      const newImgs = [...imgs];
      newImgs[info.idx] = newImage;
      await api.setStaticProductImages(token, info.slug, newImgs).catch(() => {});
      await load(); setStaticUploadingFor(null);
    };
    reader.readAsDataURL(file);
  };
  const toggleHidden = async (slug: string, currentlyHidden: boolean) => {
    setTogglingHidden(slug);
    await api.setProductVisibility(token, slug, !currentlyHidden).catch(() => {});
    setHiddenSlugs((prev) => currentlyHidden ? prev.filter((s) => s !== slug) : [...prev, slug]);
    setTogglingHidden(null);
  };

  const startEditStaticDetails = (slug: string) => {
    const prod = PRODUCTS.find((x) => x.slug === slug)!;
    const ov = staticOverrides[slug] ?? {};
    setStaticEditForm({
      description: ov.description ?? prod.description.en,
      descriptionAr: ov.descriptionAr ?? prod.description.ar,
      taglineEn: ov.taglineEn ?? prod.tagline.en,
      taglineAr: ov.taglineAr ?? prod.tagline.ar,
      features: ov.features?.length ? [...ov.features] : [...(PRODUCT_DETAILS[slug as ProductSlug]?.features ?? [])],
      colors: ov.colors
        ? [...ov.colors]
        : prod.colors
          ? prod.colors.map((c) => ({ id: c.id, label: { en: c.label.en, ar: c.label.ar }, hex: c.hex }))
          : [],
      related: ov.related ? [...ov.related] : (PRODUCT_DETAILS[slug as ProductSlug]?.related.map((r) => r.slug) ?? []),
    });
    setEditingStaticSlug(slug);
  };
  const saveStaticDetails = async () => {
    if (!editingStaticSlug) return;
    setSavingStaticDetails(true);
    await api.updateStaticProductDetails(token, editingStaticSlug, {
      description: staticEditForm.description.trim() || undefined,
      descriptionAr: staticEditForm.descriptionAr.trim() || undefined,
      taglineEn: staticEditForm.taglineEn.trim() || undefined,
      taglineAr: staticEditForm.taglineAr.trim() || undefined,
      features: staticEditForm.features.filter((f) => f.en.trim() || f.ar.trim()),
      colors: staticEditForm.colors.filter((c) => c.label.en.trim() || c.label.ar.trim()),
      related: staticEditForm.related,
    }).catch(() => {});
    await load();
    setSavingStaticDetails(false);
    setEditingStaticSlug(null);
  };
  const addStaticFeature = () => setStaticEditForm((f) => ({ ...f, features: [...f.features, { en: "", ar: "" }] }));
  const removeStaticFeature = (i: number) => setStaticEditForm((f) => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  const updateStaticFeature = (i: number, key: "en" | "ar", val: string) =>
    setStaticEditForm((f) => ({ ...f, features: f.features.map((feat, idx) => idx === i ? { ...feat, [key]: val } : feat) }));
  const addStaticColor = () => setStaticEditForm((f) => ({ ...f, colors: [...f.colors, { id: `c${Date.now()}`, label: { en: "", ar: "" }, hex: "#4B9CD3" }] }));
  const removeStaticColor = (i: number) => setStaticEditForm((f) => ({ ...f, colors: f.colors.filter((_, idx) => idx !== i) }));
  const updateStaticColorLabel = (i: number, key: "en" | "ar", val: string) =>
    setStaticEditForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, label: { ...c.label, [key]: val } } : c) }));
  const updateStaticColorHex = (i: number, val: string) =>
    setStaticEditForm((f) => ({ ...f, colors: f.colors.map((c, idx) => idx === i ? { ...c, hex: val } : c) }));

  // ── Bundle handlers ──
  const allProductOptions = [
    ...PRODUCTS.map((p) => ({ slug: p.slug, title: p.title })),
    ...products.map((p) => ({ slug: p.slug, title: p.title })),
  ];
  const startEditBundle = (id: string) => {
    const base = BUNDLES.find((b) => b.id === id)!;
    const ov = bundleOverrides[id] ?? {};
    setBundleForm({
      titleEn: ov.titleEn ?? base.title.en,
      titleAr: ov.titleAr ?? base.title.ar,
      taglineEn: ov.taglineEn ?? base.tagline.en,
      taglineAr: ov.taglineAr ?? base.tagline.ar,
      items: ov.items ?? [...base.items],
      discountPct: String(ov.discountPct ?? base.discountPct),
    });
    setEditingBundleId(id);
  };
  const saveBundle = async () => {
    if (!editingBundleId) return;
    setSavingBundle(true);
    await api.updateBundle(token, editingBundleId, {
      titleEn: bundleForm.titleEn || undefined,
      titleAr: bundleForm.titleAr || undefined,
      taglineEn: bundleForm.taglineEn || undefined,
      taglineAr: bundleForm.taglineAr || undefined,
      items: bundleForm.items,
      discountPct: Number(bundleForm.discountPct) || 0,
    }).catch(() => {});
    await load();
    setSavingBundle(false);
    setEditingBundleId(null);
  };
  const toggleBundleItem = (slug: string) =>
    setBundleForm((f) => ({ ...f, items: f.items.includes(slug) ? f.items.filter((s) => s !== slug) : [...f.items, slug] }));

  // ── User-created bundle handlers ──
  const toggleNewBundleItem = (slug: string) =>
    setNewBundleForm((f) => ({ ...f, items: f.items.includes(slug) ? f.items.filter((s) => s !== slug) : [...f.items, slug] }));
  const toggleEditUserBundleItem = (slug: string) =>
    setEditUserBundleForm((f) => ({ ...f, items: f.items.includes(slug) ? f.items.filter((s) => s !== slug) : [...f.items, slug] }));

  const createUserBundle = async () => {
    const price = Number(newBundleForm.price);
    if (!newBundleForm.titleEn.trim() || !newBundleForm.titleAr.trim() || newBundleForm.items.length === 0 || isNaN(price) || price < 0) return;
    setCreatingBundle(true);
    await api.createDynamicBundle(token, {
      titleEn: newBundleForm.titleEn.trim(),
      titleAr: newBundleForm.titleAr.trim(),
      taglineEn: newBundleForm.taglineEn.trim() || undefined,
      taglineAr: newBundleForm.taglineAr.trim() || undefined,
      items: newBundleForm.items,
      price,
    }).catch(() => {});
    setNewBundleForm(EMPTY_BUNDLE_FORM);
    await load();
    setCreatingBundle(false);
  };

  const deleteUserBundle = async (id: string) => {
    if (!window.confirm("حذف الباقة؟ لن يمكن التراجع.")) return;
    await api.deleteDynamicBundle(token, id).catch(() => {});
    setUserBundles((b) => b.filter((x) => x.id !== id));
  };

  const startEditUserBundle = (id: string) => {
    const b = userBundles.find((x) => x.id === id)!;
    setEditUserBundleForm({ titleEn: b.titleEn, titleAr: b.titleAr, taglineEn: b.taglineEn ?? "", taglineAr: b.taglineAr ?? "", items: [...b.items], price: String(b.price) });
    setEditingUserBundleId(id);
  };

  const saveUserBundle = async () => {
    if (!editingUserBundleId) return;
    const price = Number(editUserBundleForm.price);
    if (!editUserBundleForm.titleEn.trim() || !editUserBundleForm.titleAr.trim() || editUserBundleForm.items.length === 0 || isNaN(price) || price < 0) return;
    setSavingUserBundle(true);
    await api.updateDynamicBundle(token, editingUserBundleId, {
      titleEn: editUserBundleForm.titleEn.trim(),
      titleAr: editUserBundleForm.titleAr.trim(),
      taglineEn: editUserBundleForm.taglineEn.trim() || undefined,
      taglineAr: editUserBundleForm.taglineAr.trim() || undefined,
      items: editUserBundleForm.items,
      price,
    }).catch(() => {});
    await load();
    setSavingUserBundle(false);
    setEditingUserBundleId(null);
  };

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <input ref={primaryFileInputRef} type="file" accept="image/*" className="hidden" onChange={onPrimaryFileChange} />
      <input ref={staticFileInputRef} type="file" accept="image/*" className="hidden" onChange={onStaticFileChange} />
      <input ref={staticReplaceFileInputRef} type="file" accept="image/*" className="hidden" onChange={onStaticReplaceFileChange} />

      {/* Sub-tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {(["dynamic", "static", "bundles"] as const).map((key) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${subTab === key ? "bg-brand text-white" : "bg-soft border border-border text-ink hover:bg-white"}`}
          >
            {key === "dynamic" ? "منتجات مضافة" : key === "static" ? "المنتجات الأصلية" : "الباقات"}
          </button>
        ))}
      </div>

      {/* ── Dynamic products ── */}
      {subTab === "dynamic" && (
        <div className="space-y-8">
          <section>
            <h3 className="font-display text-xl mb-4">إضافة منتج جديد</h3>
            <div className="lux-card p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم (إنجليزي)</label>
                  <input className="lux-input" placeholder="Electric Brush" value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value, slug: slugify(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الاسم (عربي)</label>
                  <input className="lux-input" placeholder="فرشاة كهربائية" value={form.titleAr} dir="rtl"
                    onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الـ Slug (رابط المنتج)</label>
                  <input className="lux-input" placeholder="electric-brush" value={form.slug} dir="ltr"
                    onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">السعر (ج.م)</label>
                    <input className="lux-input" type="number" min={0} placeholder="500" value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">سعر الخصم (اختياري)</label>
                    <input className="lux-input" type="number" min={0} placeholder="450" value={form.salePrice}
                      onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                  <textarea className="lux-input min-h-[80px] resize-y" placeholder="Product description..."
                    value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                  <textarea className="lux-input min-h-[80px] resize-y" placeholder="وصف المنتج..." dir="rtl"
                    value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">المميزات</label>
                  <button type="button" onClick={addFeature} className="text-xs text-deep-blue hover:underline">+ إضافة ميزة</button>
                </div>
                {form.features.length === 0 ? <p className="text-xs text-muted-foreground">لا توجد مميزات</p> : (
                  <div className="space-y-2">
                    {form.features.map((feat, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input className="lux-input text-xs flex-1" placeholder="Feature in English" value={feat.en}
                          onChange={(e) => updateFeature(i, "en", e.target.value)} />
                        <input className="lux-input text-xs flex-1" placeholder="الميزة بالعربي" value={feat.ar} dir="rtl"
                          onChange={(e) => updateFeature(i, "ar", e.target.value)} />
                        <button type="button" onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Colors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground">الألوان (اختياري — إذا كان المنتج له ألوان)</label>
                  <button type="button" onClick={addColor} className="text-xs text-deep-blue hover:underline">+ إضافة لون</button>
                </div>
                {form.colors.length === 0 ? <p className="text-xs text-muted-foreground">بدون ألوان</p> : (
                  <div className="space-y-2">
                    {form.colors.map((c, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input type="color" value={c.hex} onChange={(e) => updateColorHex(i, e.target.value)}
                          className="h-9 w-12 rounded-lg border border-border cursor-pointer p-1 shrink-0" />
                        <input className="lux-input text-xs flex-1" placeholder="Color name EN" value={c.label.en}
                          onChange={(e) => updateColorLabel(i, "en", e.target.value)} />
                        <input className="lux-input text-xs flex-1" placeholder="اسم اللون" value={c.label.ar} dir="rtl"
                          onChange={(e) => updateColorLabel(i, "ar", e.target.value)} />
                        <button type="button" onClick={() => removeColor(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={addProduct} disabled={saving || !form.title || !form.titleAr || !form.slug || !form.price}
                className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? "جاري الإضافة..." : "+ إضافة المنتج"}
              </button>
            </div>
          </section>

          <section>
            <h3 className="font-display text-xl mb-4">المنتجات المضافة ({products.length})</h3>
            {products.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground text-sm">لا توجد منتجات مضافة بعد</p>
            ) : (
              <div className="space-y-4">
                {products.map((p) => (
                  <div key={p.id} className="lux-card p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-display text-lg" dir="ltr">{p.title}</p>
                        <p className="text-sm text-muted-foreground">{p.titleAr}</p>
                        <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">/{p.slug}</p>
                        <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                          <span className="font-medium text-ink">{p.price.toLocaleString("ar-EG")} ج.م</span>
                          {p.salePrice && <span className="text-emerald-600">{p.salePrice.toLocaleString("ar-EG")} ج.م (خصم)</span>}
                          {p.colors?.length ? (
                            <div className="flex gap-1">
                              {p.colors.map((c) => <span key={c.id} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} title={c.label.en} />)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <button onClick={() => deleteProduct(p.id)}
                        className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> حذف
                      </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      {/* Primary image */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-ink">الصورة الأساسية</p>
                          <button onClick={() => openPrimaryImagePicker(p.id)} disabled={primaryUploadingFor === p.id}
                            className="btn-ghost text-xs py-1 px-3 disabled:opacity-50">
                            {primaryUploadingFor === p.id ? "جاري الرفع..." : p.images[0] ? "استبدال" : "+ رفع صورة"}
                          </button>
                        </div>
                        {p.images[0] ? (
                          <div className="relative group w-fit">
                            <img src={p.images[0]} alt="" className="h-28 w-28 object-cover rounded-xl border-2 border-deep-blue/30" />
                            <button onClick={() => removeImage(p.id, 0)}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                          </div>
                        ) : (
                          <button onClick={() => openPrimaryImagePicker(p.id)} disabled={primaryUploadingFor === p.id}
                            className="h-28 w-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground hover:border-deep-blue/40 hover:bg-soft transition-colors disabled:opacity-50">
                            {primaryUploadingFor === p.id ? "..." : "+ صورة"}
                          </button>
                        )}
                      </div>

                      {/* Gallery images */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-ink">
                            صور فرعية {p.images.length > 1 ? `(${p.images.length - 1})` : ""}
                          </p>
                          <button onClick={() => openImagePicker(p.id)} disabled={uploadingFor === p.id}
                            className="btn-ghost text-xs py-1 px-3 disabled:opacity-50">
                            {uploadingFor === p.id ? "جاري الرفع..." : "+ إضافة صورة فرعية"}
                          </button>
                        </div>
                        {p.images.length <= 1 ? (
                          <p className="text-xs text-muted-foreground">لا توجد صور فرعية بعد</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {p.images.slice(1).map((src, relIdx) => {
                              const idx = relIdx + 1;
                              return (
                                <div key={idx} className="relative group">
                                  <img src={src} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
                                  <button onClick={() => removeImage(p.id, idx)}
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Static products ── */}
      {subTab === "static" && (
        <section>
          <h3 className="font-display text-xl mb-4">المنتجات الأصلية ({PRODUCTS.length})</h3>
          <div className="space-y-6">
            {PRODUCTS.map((p) => {
              const customImgs = imageOverrides[p.slug] ?? [];
              const hasCustomImgs = customImgs.length > 0;
              const origGallery = PRODUCT_GALLERIES[p.slug] ?? [p.image];
              const displayImages = hasCustomImgs ? customImgs : origGallery;

              const isHidden = hiddenSlugs.includes(p.slug);
              const priceOv = pricingOverrides[p.slug];
              const displayPrice = priceOv?.price ?? p.price;
              const displaySalePrice = priceOv !== undefined ? priceOv.salePrice : p.salePrice;

              const textOv = staticOverrides[p.slug] ?? {};
              const currentDesc = { en: textOv.description || p.description.en, ar: textOv.descriptionAr || p.description.ar };
              const currentTagline = { en: textOv.taglineEn || p.tagline.en, ar: textOv.taglineAr || p.tagline.ar };
              const currentFeatures = textOv.features?.length ? textOv.features : (PRODUCT_DETAILS[p.slug as ProductSlug]?.features ?? []);
              const currentColors = textOv.colors ?? p.colors ?? [];

              const isEditingDetails = editingStaticSlug === p.slug;

              return (
                <div key={p.slug} className={`lux-card p-5 space-y-5 transition-opacity ${isHidden ? "opacity-60" : ""}`}>

                  {/* ── Header ── */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-xl" dir="ltr">{p.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">/{p.slug}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink">
                          {(displaySalePrice ?? displayPrice).toLocaleString("ar-EG")} ج.م
                        </span>
                        {displaySalePrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            {displayPrice.toLocaleString("ar-EG")} ج.م
                          </span>
                        )}
                        {currentColors.length > 0 && (
                          <div className="flex gap-1">
                            {currentColors.map((c) => (
                              <span key={c.id} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} title={c.label.ar || c.label.en} />
                            ))}
                          </div>
                        )}
                        {isHidden && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 rounded-full px-2 py-0.5">مخفي</span>}
                      </div>
                    </div>
                    <button onClick={() => toggleHidden(p.slug, isHidden)} disabled={togglingHidden === p.slug}
                      className={`text-xs border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 shrink-0 ${isHidden ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-amber-200 text-amber-600 hover:bg-amber-50"}`}>
                      {togglingHidden === p.slug ? "..." : isHidden ? "إظهار" : "إخفاء"}
                    </button>
                  </div>

                  {/* ── Images ── */}
                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-ink">الصور ({displayImages.length})</p>
                      </div>
                      <button onClick={() => openStaticImagePicker(p.slug)} disabled={staticUploadingFor === p.slug}
                        className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50">
                        {staticUploadingFor === p.slug ? "جاري الرفع..." : "+ إضافة صورة"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {displayImages.map((src, idx) => {
                        const isPrimary = idx === 0;
                        const settingThis = staticSettingPrimary === `${p.slug}:${idx}`;
                        const replacingThis = staticUploadingFor === `${p.slug}:${idx}`;
                        return (
                          <div key={`${src}-${idx}`} className="relative group flex flex-col items-center gap-1">
                            <div className={`relative h-20 w-20 rounded-xl border-2 overflow-hidden ${isPrimary ? "border-deep-blue" : "border-border"}`}>
                              <img src={src} alt="" className="w-full h-full object-cover" />
                              {/* Delete button — top corner on hover */}
                              <button onClick={() => removeStaticImage(p.slug, idx)}
                                className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">×</button>
                            </div>
                            {/* Controls below each image */}
                            <div className="flex gap-1">
                              {isPrimary ? (
                                <span className="text-[9px] text-deep-blue font-medium px-1">أساسية</span>
                              ) : (
                                <button
                                  onClick={() => setStaticImagePrimary(p.slug, idx)}
                                  disabled={!!settingThis}
                                  title="تعيين كأساسية"
                                  className="h-6 px-1.5 rounded-md bg-deep-blue/10 text-deep-blue text-[9px] font-medium hover:bg-deep-blue/20 transition-colors disabled:opacity-50">
                                  {settingThis ? "..." : "⭐ أساسية"}
                                </button>
                              )}
                              <button
                                onClick={() => openStaticReplaceImagePicker(p.slug, idx)}
                                disabled={replacingThis}
                                title="استبدال الصورة"
                                className="h-6 px-1.5 rounded-md bg-soft border border-border text-[9px] hover:bg-white transition-colors disabled:opacity-50">
                                {replacingThis ? "..." : "بدّل"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Info / Edit ── */}
                  <div className="border-t border-border pt-4">
                    {!isEditingDetails ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-ink">التفاصيل</p>
                          <button onClick={() => startEditStaticDetails(p.slug)}
                            className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors">
                            تعديل
                          </button>
                        </div>

                        {/* Tagline */}
                        <div className="bg-soft rounded-xl px-4 py-3 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">الوصف المختصر</p>
                          <p className="text-sm text-ink" dir="rtl">{currentTagline.ar}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{currentTagline.en}</p>
                        </div>

                        {/* Description */}
                        <div className="bg-soft rounded-xl px-4 py-3 space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">الوصف الكامل</p>
                          <p className="text-sm text-ink leading-relaxed line-clamp-4" dir="rtl">{currentDesc.ar}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mt-1" dir="ltr">{currentDesc.en}</p>
                        </div>

                        {/* Features */}
                        {currentFeatures.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">المميزات</p>
                            <div className="space-y-1">
                              {currentFeatures.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <span className="text-deep-blue mt-0.5 shrink-0">✓</span>
                                  <span dir="rtl">{f.ar}</span>
                                  {f.en && <span className="text-muted-foreground" dir="ltr">· {f.en}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Colors */}
                        {currentColors.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">الألوان ({currentColors.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {currentColors.map((c) => (
                                <div key={c.id} className="flex items-center gap-1.5 text-xs bg-soft border border-border rounded-full px-2.5 py-1">
                                  <span className="h-3 w-3 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                                  <span>{c.label.ar || c.label.en}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-xs font-medium text-ink">تعديل التفاصيل</p>

                        {/* Tagline */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف المختصر (إنجليزي)</label>
                            <input className="lux-input text-xs" value={staticEditForm.taglineEn}
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, taglineEn: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف المختصر (عربي)</label>
                            <input className="lux-input text-xs" value={staticEditForm.taglineAr} dir="rtl"
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, taglineAr: e.target.value }))} />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف الكامل (إنجليزي)</label>
                            <textarea className="lux-input text-xs min-h-[100px] resize-y" value={staticEditForm.description}
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, description: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">الوصف الكامل (عربي)</label>
                            <textarea className="lux-input text-xs min-h-[100px] resize-y" value={staticEditForm.descriptionAr} dir="rtl"
                              onChange={(e) => setStaticEditForm((f) => ({ ...f, descriptionAr: e.target.value }))} />
                          </div>
                        </div>

                        {/* Features */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-muted-foreground">المميزات</label>
                            <button type="button" onClick={addStaticFeature} className="text-xs text-deep-blue hover:underline">+ إضافة ميزة</button>
                          </div>
                          {staticEditForm.features.length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا توجد مميزات</p>
                          ) : (
                            <div className="space-y-2">
                              {staticEditForm.features.map((feat, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input className="lux-input text-xs flex-1" placeholder="Feature in English" value={feat.en}
                                    onChange={(e) => updateStaticFeature(i, "en", e.target.value)} />
                                  <input className="lux-input text-xs flex-1" placeholder="الميزة بالعربي" value={feat.ar} dir="rtl"
                                    onChange={(e) => updateStaticFeature(i, "ar", e.target.value)} />
                                  <button type="button" onClick={() => removeStaticFeature(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Colors */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-muted-foreground">الألوان</label>
                            <button type="button" onClick={addStaticColor} className="text-xs text-deep-blue hover:underline">+ إضافة لون</button>
                          </div>
                          {staticEditForm.colors.length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا يوجد ألوان</p>
                          ) : (
                            <div className="space-y-2">
                              {staticEditForm.colors.map((c, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <input type="color" value={c.hex} onChange={(e) => updateStaticColorHex(i, e.target.value)}
                                    className="h-9 w-12 rounded-lg border border-border cursor-pointer p-1 shrink-0" />
                                  <input className="lux-input text-xs flex-1" placeholder="Color name EN" value={c.label.en}
                                    onChange={(e) => updateStaticColorLabel(i, "en", e.target.value)} />
                                  <input className="lux-input text-xs flex-1" placeholder="اسم اللون" value={c.label.ar} dir="rtl"
                                    onChange={(e) => updateStaticColorLabel(i, "ar", e.target.value)} />
                                  <button type="button" onClick={() => removeStaticColor(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Related products */}
                        <div>
                          <label className="text-xs text-muted-foreground mb-2 block">المنتجات المرتبطة (Related)</label>
                          <div className="space-y-1.5">
                            {[
                              ...PRODUCTS.filter((x) => x.slug !== p.slug).map((x) => ({ slug: x.slug, title: x.title })),
                              ...products.filter((x) => x.slug !== p.slug).map((x) => ({ slug: x.slug, title: x.title })),
                            ].map((opt) => {
                              const checked = staticEditForm.related.includes(opt.slug);
                              return (
                                <label key={opt.slug} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => setStaticEditForm((f) => ({
                                      ...f,
                                      related: checked
                                        ? f.related.filter((s) => s !== opt.slug)
                                        : [...f.related, opt.slug],
                                    }))}
                                    className="rounded border-border"
                                  />
                                  <span dir="ltr">{opt.title}</span>
                                  <span className="text-muted-foreground" dir="ltr">/{opt.slug}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={saveStaticDetails} disabled={savingStaticDetails}
                            className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
                            {savingStaticDetails ? "جاري الحفظ..." : "حفظ التعديلات"}
                          </button>
                          <button onClick={() => setEditingStaticSlug(null)} className="btn-ghost text-xs py-1.5 px-3">إلغاء</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Bundles ── */}
      {subTab === "bundles" && (
        <div className="space-y-8">

        {/* Create new bundle */}
        <section>
          <h3 className="font-display text-xl mb-4">إضافة باقة جديدة</h3>
          <div className="lux-card p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (إنجليزي)</label>
                <input className="lux-input text-sm" placeholder="Smile Bundle" value={newBundleForm.titleEn}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, titleEn: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (عربي)</label>
                <input className="lux-input text-sm" placeholder="باقة سمايل" dir="rtl" value={newBundleForm.titleAr}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, titleAr: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                <input className="lux-input text-sm" placeholder="Complete oral care" value={newBundleForm.taglineEn}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, taglineEn: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                <input className="lux-input text-sm" placeholder="عناية كاملة بالفم" dir="rtl" value={newBundleForm.taglineAr}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, taglineAr: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">السعر (جنيه)</label>
                <input className="lux-input text-sm" type="number" min={0} placeholder="499" value={newBundleForm.price}
                  onChange={(e) => setNewBundleForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">المنتجات في الباقة</label>
              <div className="flex flex-wrap gap-2">
                {allProductOptions.map((opt) => {
                  const checked = newBundleForm.items.includes(opt.slug);
                  return (
                    <button key={opt.slug} type="button" onClick={() => toggleNewBundleItem(opt.slug)}
                      className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${checked ? "bg-deep-blue/10 border-deep-blue text-deep-blue" : "border-border hover:bg-soft"}`}>
                      {checked ? "✓ " : ""}{opt.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={createUserBundle} disabled={creatingBundle || !newBundleForm.titleEn.trim() || !newBundleForm.titleAr.trim() || newBundleForm.items.length === 0 || !newBundleForm.price}
              className="btn-primary text-sm disabled:opacity-50">
              {creatingBundle ? "جاري الإضافة..." : "إضافة الباقة"}
            </button>
          </div>
        </section>

        {/* User-created bundles */}
        {userBundles.length > 0 && (
        <section>
          <h3 className="font-display text-xl mb-4">الباقات المضافة ({userBundles.length})</h3>
          <div className="space-y-4">
            {userBundles.map((b) => {
              const isEditing = editingUserBundleId === b.id;
              return (
                <div key={b.id} className="lux-card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-lg">{b.titleAr}</p>
                      {b.taglineAr && <p className="text-xs text-muted-foreground mt-0.5">{b.taglineAr}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-medium text-deep-blue">{b.price} جنيه</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{b.items.length} منتجات</span>
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {b.items.map((slug) => {
                          const sp = PRODUCTS.find((p) => p.slug === slug) || products.find((p) => p.slug === slug);
                          return sp ? <span key={slug} className="text-[10px] bg-soft border border-border rounded px-1.5 py-0.5" dir="ltr">{sp.title}</span> : null;
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => isEditing ? setEditingUserBundleId(null) : startEditUserBundle(b.id)}
                        className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors">
                        {isEditing ? "إغلاق" : "تعديل"}
                      </button>
                      <button onClick={() => deleteUserBundle(b.id)}
                        className="text-xs border border-destructive/30 text-destructive rounded-lg px-3 py-1.5 hover:bg-destructive/5 transition-colors">
                        حذف
                      </button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (إنجليزي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.titleEn}
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, titleEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (عربي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.titleAr} dir="rtl"
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, titleAr: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.taglineEn}
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, taglineEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                          <input className="lux-input text-sm" value={editUserBundleForm.taglineAr} dir="rtl"
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, taglineAr: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">السعر (جنيه)</label>
                          <input className="lux-input text-sm" type="number" min={0} value={editUserBundleForm.price}
                            onChange={(e) => setEditUserBundleForm((f) => ({ ...f, price: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">المنتجات في الباقة</label>
                        <div className="flex flex-wrap gap-2">
                          {allProductOptions.map((opt) => {
                            const checked = editUserBundleForm.items.includes(opt.slug);
                            return (
                              <button key={opt.slug} type="button" onClick={() => toggleEditUserBundleItem(opt.slug)}
                                className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${checked ? "bg-deep-blue/10 border-deep-blue text-deep-blue" : "border-border hover:bg-soft"}`}>
                                {checked ? "✓ " : ""}{opt.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveUserBundle} disabled={savingUserBundle}
                          className="btn-primary text-sm disabled:opacity-50">
                          {savingUserBundle ? "جاري الحفظ..." : "حفظ التعديلات"}
                        </button>
                        <button onClick={() => setEditingUserBundleId(null)} className="btn-ghost text-sm">إلغاء</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Hardcoded bundle overrides */}
        <section>
          <h3 className="font-display text-xl mb-4">الباقات الأصلية ({BUNDLES.length})</h3>
          <div className="space-y-4">
            {BUNDLES.map((b) => {
              const ov = bundleOverrides[b.id] ?? {};
              const currentTitle = ov.titleAr || b.title.ar;
              const currentItems = ov.items ?? b.items;
              const currentDiscount = ov.discountPct ?? b.discountPct;
              const isEditing = editingBundleId === b.id;
              return (
                <div key={b.id} className="lux-card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-display text-lg">{currentTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ov.taglineAr || b.tagline.ar}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-ink">خصم {currentDiscount}%</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{currentItems.length} منتجات</span>
                        {Object.keys(ov).length > 0 && <span className="text-[10px] bg-deep-blue/10 text-deep-blue rounded-full px-2 py-0.5">معدّل</span>}
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {currentItems.map((slug) => {
                          const sp = PRODUCTS.find((p) => p.slug === slug) || products.find((p) => p.slug === slug);
                          return sp ? <span key={slug} className="text-[10px] bg-soft border border-border rounded px-1.5 py-0.5" dir="ltr">{sp.title}</span> : null;
                        })}
                      </div>
                    </div>
                    <button onClick={() => isEditing ? setEditingBundleId(null) : startEditBundle(b.id)}
                      className="text-xs border border-border rounded-lg px-3 py-1.5 hover:bg-soft transition-colors shrink-0">
                      {isEditing ? "إغلاق" : "تعديل"}
                    </button>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (إنجليزي)</label>
                          <input className="lux-input text-sm" value={bundleForm.titleEn}
                            onChange={(e) => setBundleForm((f) => ({ ...f, titleEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">اسم الباقة (عربي)</label>
                          <input className="lux-input text-sm" value={bundleForm.titleAr} dir="rtl"
                            onChange={(e) => setBundleForm((f) => ({ ...f, titleAr: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (إنجليزي)</label>
                          <input className="lux-input text-sm" value={bundleForm.taglineEn}
                            onChange={(e) => setBundleForm((f) => ({ ...f, taglineEn: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">الوصف (عربي)</label>
                          <input className="lux-input text-sm" value={bundleForm.taglineAr} dir="rtl"
                            onChange={(e) => setBundleForm((f) => ({ ...f, taglineAr: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">نسبة الخصم (%)</label>
                          <input className="lux-input text-sm" type="number" min={0} max={100} value={bundleForm.discountPct}
                            onChange={(e) => setBundleForm((f) => ({ ...f, discountPct: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">المنتجات في الباقة</label>
                        <div className="flex flex-wrap gap-2">
                          {allProductOptions.map((opt) => {
                            const checked = bundleForm.items.includes(opt.slug);
                            return (
                              <button key={opt.slug} type="button" onClick={() => toggleBundleItem(opt.slug)}
                                className={`text-xs border rounded-lg px-3 py-1.5 transition-colors ${checked ? "bg-deep-blue/10 border-deep-blue text-deep-blue" : "border-border hover:bg-soft"}`}>
                                {checked ? "✓ " : ""}{opt.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveBundle} disabled={savingBundle}
                          className="btn-primary text-sm disabled:opacity-50">
                          {savingBundle ? "جاري الحفظ..." : "حفظ التعديلات"}
                        </button>
                        <button onClick={() => setEditingBundleId(null)} className="btn-ghost text-sm">إلغاء</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "inventory" | "pricing" | "analytics" | "sales" | "delivered" | "products">("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<OrderStatus | null>(null);
  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getOrders(token);
      setOrders(data);
    } catch (err) {
      const msg = String(err);
      if (msg.includes("Unauthorized") || msg.includes("Invalid token")) {
        clearToken();
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleStatusChange = async (id: string, status: OrderStatus) => {
    await api.updateOrderStatus(token, id, status);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const handleDeleteOrder = async (id: string) => {
    await api.deleteOrder(token, id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const handleEditOrder = useCallback(async (id: string, patch: {
    total?: number;
    notes?: string;
    items?: OrderItem[];
    subtotal?: number;
    bundleDiscount?: number;
    promoDiscount?: number;
    shippingFee?: number;
  }) => {
    await api.editOrder(token, id, patch);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              ...(patch.total !== undefined ? { total: patch.total } : {}),
              ...(patch.notes !== undefined ? { notes: (patch.notes || "").trim() || undefined } : {}),
              ...(patch.items !== undefined ? { items: patch.items } : {}),
              ...(patch.subtotal !== undefined ? { subtotal: patch.subtotal } : {}),
              ...(patch.bundleDiscount !== undefined ? { bundleDiscount: patch.bundleDiscount } : {}),
              ...(patch.promoDiscount !== undefined ? { promoDiscount: patch.promoDiscount } : {}),
              ...(patch.shippingFee !== undefined ? { shippingFee: patch.shippingFee } : {}),
            }
          : o
      )
    );
  }, [token]);

  // Drag & drop handlers
  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragEnd = () => { setDraggingId(null); setDragOverCol(null); };
  const handleDragOver = (e: React.DragEvent, col: OrderStatus) => {
    e.preventDefault();
    setDragOverCol(col);
  };
  const handleDropOnCol = async (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    if (!draggingId) return;
    const order = orders.find((o) => o.id === draggingId);
    if (order && order.status !== newStatus) {
      await handleStatusChange(draggingId, newStatus);
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  // Search filter
  const searched = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.items.some((i) => i.title.toLowerCase().includes(q))
    );
  }, [orders, searchQuery]);

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    dispatched: orders.filter((o) => o.status === "dispatched").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    revenue: orders.reduce((s, o) => s + o.total, 0),
  };

  const pendingOrders    = searched.filter((o) => o.status === "pending");
  const dispatchedOrders = searched.filter((o) => o.status === "dispatched");

  return (
    <div className="min-h-screen bg-soft" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-border">
        <div className="container-lux flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-brand text-white flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
            <span className="font-display text-lg text-ink">Smile Maker · Dashboard</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm("هل تريد تسجيل الخروج؟")) {
                clearToken();
                onLogout();
              }
            }}
            className="flex items-center gap-1.5 rounded-full border border-red-200 text-red-600 bg-white hover:bg-red-50 px-3 py-2 text-sm font-medium transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            تسجيل خروج
          </button>
        </div>
      </header>

      <div className="container-lux py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="قيد الانتظار"      value={stats.pending}    icon={Clock}        />
          <StatCard label="خروج مع الشحن"    value={stats.dispatched}  icon={Truck}        />
          <StatCard label="تم الاستلام"      value={stats.delivered}   icon={CheckCircle2} />
          <StatCard label="إجمالي الإيرادات" value={`${formatEGP(stats.revenue)} EGP`} icon={TrendingUp} accent />
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 bg-white border border-border rounded-2xl p-1 w-fit">
          {(
            [
              { key: "orders",    label: "الأوردرات"  },
              { key: "inventory", label: "المخزون"    },
              { key: "pricing",   label: "الأسعار"    },
              { key: "analytics", label: "التحليلات"  },
              { key: "sales",     label: "المبيعات"   },
              { key: "delivered", label: "المُسلَّمة" },
              { key: "products",  label: "المنتجات"   },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === key ? "bg-brand text-white shadow-sm" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {tab === "orders" && (
          <div className="space-y-5">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، رقم التليفون، ID الأوردر، المدينة..."
                className="lux-input ps-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-ink"
                >
                  ✕
                </button>
              )}
            </div>

            {searchQuery && (
              <p className="text-sm text-muted-foreground">
                نتائج البحث عن "{searchQuery}": {searched.length} أوردر
              </p>
            )}

            {loading ? (
              <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {(
                  [
                    { key: "pending"    as OrderStatus, orders: pendingOrders,    empty: "انتظار أوردر جديد..." },
                    { key: "dispatched" as OrderStatus, orders: dispatchedOrders, empty: "اسحب هنا لما تسلّمه للشحن" },
                  ] as const
                ).map(({ key, orders: colOrders, empty }) => {
                  const cfg = STATUS_CONFIG[key];
                  const isOver = dragOverCol === key;
                  const colColors: Record<OrderStatus, string> = {
                    pending:    isOver ? "border-amber-400 bg-amber-50/70"     : "border-dashed border-amber-200 bg-amber-50/20",
                    dispatched: isOver ? "border-blue-400 bg-blue-50/70"       : "border-dashed border-blue-200 bg-blue-50/20",
                    delivered:  isOver ? "border-emerald-400 bg-emerald-50/70" : "border-dashed border-emerald-200 bg-emerald-50/20",
                  };
                  const countColors: Record<OrderStatus, string> = {
                    pending:    "text-amber-700 bg-amber-100 border-amber-200",
                    dispatched: "text-blue-700 bg-blue-100 border-blue-200",
                    delivered:  "text-emerald-700 bg-emerald-100 border-emerald-200",
                  };
                  const iconColors: Record<OrderStatus, string> = {
                    pending: "text-amber-600", dispatched: "text-blue-600", delivered: "text-emerald-600",
                  };
                  return (
                    <div
                      key={key}
                      className={`min-h-48 rounded-2xl p-3 transition-all border-2 ${colColors[key]}`}
                      onDragOver={(e) => handleDragOver(e, key)}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={(e) => handleDropOnCol(e, key)}
                    >
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <cfg.Icon className={`h-4 w-4 shrink-0 ${iconColors[key]}`} />
                        <span className="font-medium text-ink text-sm">{cfg.label}</span>
                        <span className={`ms-auto text-xs font-medium border rounded-full px-2 py-0.5 ${countColors[key]}`}>
                          {colOrders.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {colOrders.map((order) => (
                          <div
                            key={order.id}
                            draggable
                            onDragStart={() => handleDragStart(order.id)}
                            onDragEnd={handleDragEnd}
                            className={`cursor-grab active:cursor-grabbing transition-all ${draggingId === order.id ? "opacity-40 scale-95" : ""}`}
                          >
                            <OrderCard
                              order={order}
                              onStatusChange={handleStatusChange}
                              onDelete={handleDeleteOrder}
                              onEdit={handleEditOrder}
                              isDragging={draggingId === order.id}
                            />
                          </div>
                        ))}
                        {colOrders.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-current/20 rounded-xl">
                            {searchQuery ? "لا نتائج" : empty}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Inventory tab */}
        {tab === "inventory" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 text-deep-blue" />
              <p className="text-sm text-muted-foreground">
                ضع الكمية 0 عشان المنتج أو اللون يبقى مشطوب عليه تلقائياً في صفحة الأوردر
              </p>
            </div>
            <InventorySection token={token} />
          </div>
        )}

        {/* Pricing tab */}
        {tab === "pricing" && <PricingSection token={token} />}

        {/* Analytics tab */}
        {tab === "analytics" && <AnalyticsSection orders={orders} />}

        {/* Sales tab */}
        {tab === "sales" && <SalesSection orders={orders} />}

        {/* Delivered tab */}
        {tab === "delivered" && <DeliveredSection orders={orders} onDelete={handleDeleteOrder} />}

        {/* Products tab */}
        {tab === "products" && <ProductsSection token={token} />}
      </div>
    </div>
  );
}

// ─── Root Page Component ──────────────────────────────────────────────────────

function DashboardPage() {
  const [token, setToken] = useState<string | null>(() => getToken());

  // Clear the token from storage whenever the user leaves the dashboard,
  // so they must re-enter the password on every visit.
  useEffect(() => {
    return () => {
      clearToken();
    };
  }, []);

  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  return <Dashboard token={token} onLogout={() => setToken(null)} />;
}
