import { useEffect, useState } from "react";
import {
  RefreshCw,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Order, OrderItem } from "@/lib/api";
import { formatEGP } from "@/data/products";
import { STATUS_CONFIG, type OrderStatus } from "./types";

export function OrderCard({
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
