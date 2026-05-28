import { useState, useMemo } from "react";
import { CheckCircle2, TrendingUp, Tag, Search, ChevronDown, RefreshCw, Trash2 } from "lucide-react";
import type { Order } from "@/lib/api";
import { formatEGP } from "@/data/products";
import { StatCard } from "./StatCard";

export function DeliveredSection({ orders, onDelete }: { orders: Order[]; onDelete: (id: string) => Promise<void> }) {
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
