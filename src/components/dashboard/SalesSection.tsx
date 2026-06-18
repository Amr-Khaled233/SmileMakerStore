import { useEffect, useState, useMemo } from "react";
import { TrendingUp, Package, Stethoscope, FileText } from "lucide-react";
import type { Order } from "@/lib/api";
import { formatEGP } from "@/data/products";
import { CHART_GRADIENTS } from "./types";

type CommissionRow = { name: string; pct: number; orders: number; sales: number; commission: number };

export function SalesSection({ orders }: { orders: Order[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Referral commissions — aggregated from the commission snapshot stored on
  // each order. Base = order total. Grouped separately for doctors & reports.
  const commissions = useMemo(() => {
    const doctors = new Map<string, CommissionRow>();
    const reports = new Map<string, CommissionRow>();
    const add = (map: Map<string, CommissionRow>, name: string, pct: number, total: number) => {
      const ex = map.get(name) ?? { name, pct, orders: 0, sales: 0, commission: 0 };
      ex.orders += 1;
      ex.sales += total;
      ex.commission += Math.round((total * pct) / 100);
      ex.pct = pct;
      map.set(name, ex);
    };
    for (const o of orders) {
      if (o.promoDoctorName && o.promoDoctorPct) add(doctors, o.promoDoctorName, o.promoDoctorPct, o.total);
      if (o.promoReportName && o.promoReportPct) add(reports, o.promoReportName, o.promoReportPct, o.total);
    }
    const sort = (m: Map<string, CommissionRow>) => [...m.values()].sort((a, b) => b.commission - a.commission);
    return { doctors: sort(doctors), reports: sort(reports) };
  }, [orders]);
  const hasCommissions = commissions.doctors.length > 0 || commissions.reports.length > 0;

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

      {/* Referral commissions */}
      {hasCommissions && (
        <div className="grid gap-6 md:grid-cols-2">
          <CommissionCard
            title="عمولات الدكاترة"
            icon={Stethoscope}
            rows={commissions.doctors}
            empty="لا توجد أكواد مربوطة بدكتور"
          />
          <CommissionCard
            title="عمولات التقارير الطبية"
            icon={FileText}
            rows={commissions.reports}
            empty="لا توجد أكواد مربوطة بتقرير طبي"
          />
        </div>
      )}
    </div>
  );
}

function CommissionCard({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: typeof Stethoscope;
  rows: CommissionRow[];
  empty: string;
}) {
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  return (
    <div className="lux-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5 text-deep-blue" />
        <h3 className="font-display text-xl">{title}</h3>
        {rows.length > 0 && (
          <span className="ms-auto text-sm font-bold text-deep-blue">{formatEGP(totalCommission)}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">العمولة محسوبة من إجمالي كل أوردر استخدم الكود</p>
      {rows.length === 0 ? (
        <p className="text-center py-6 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between gap-3 rounded-xl bg-soft px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {r.orders} أوردر · مبيعات {formatEGP(r.sales)} · {r.pct}%
                </p>
              </div>
              <span className="text-sm font-bold text-deep-blue whitespace-nowrap">{formatEGP(r.commission)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
