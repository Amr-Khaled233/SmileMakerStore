import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  LogOut,
  Package,
  ChevronDown,
  Search,
  Truck,
} from "lucide-react";

import { api, getToken, clearToken } from "@/lib/api";
import type { Order, OrderItem } from "@/lib/api";
import { formatEGP } from "@/data/products";

import { type OrderStatus, STATUS_CONFIG } from "@/components/dashboard/types";
import { StatCard } from "@/components/dashboard/StatCard";
import { OrderCard } from "@/components/dashboard/OrderCard";
import { LoginScreen } from "@/components/dashboard/LoginScreen";
import { InventorySection } from "@/components/dashboard/InventorySection";
import { PricingSection } from "@/components/dashboard/PricingSection";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { SalesSection } from "@/components/dashboard/SalesSection";
import { DeliveredSection } from "@/components/dashboard/DeliveredSection";
import { ProductsSection } from "@/components/dashboard/ProductsSection";
import { ReviewsSection } from "@/components/dashboard/ReviewsSection";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

// ─── Main Dashboard ──────────────────────────────────────────────────────────

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "inventory" | "pricing" | "analytics" | "sales" | "delivered" | "products" | "reviews">("orders");
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
              { key: "reviews",   label: "آراء العملاء" },
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

        {/* Reviews tab */}
        {tab === "reviews" && <ReviewsSection token={token} />}
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
