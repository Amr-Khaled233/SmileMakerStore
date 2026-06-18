import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Package } from "lucide-react";
import type { Order } from "@/lib/api";
import { formatEGP } from "@/data/products";
import { CHART_GRADIENTS } from "./types";

export function SalesSection({ orders }: { orders: Order[] }) {
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
