import { useMemo } from "react";
import { TrendingUp, CheckCircle2, Package, Tag } from "lucide-react";
import type { Order } from "@/lib/api";
import { formatEGP } from "@/data/products";
import { StatCard } from "./StatCard";
import { CHART_GRADIENTS } from "./types";

export function AnalyticsSection({ orders }: { orders: Order[] }) {
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
