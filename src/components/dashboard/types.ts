import type React from "react";
import { Clock, CheckCircle2, Truck } from "lucide-react";

export type OrderStatus = "pending" | "dispatched" | "delivered";

export const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; badge: string; Icon: React.ElementType }> = {
  pending:    { label: "قيد الانتظار",   color: "amber",   badge: "bg-amber-50 text-amber-700 border-amber-200",      Icon: Clock },
  dispatched: { label: "خروج مع الشحن", color: "blue",    badge: "bg-blue-50 text-blue-700 border-blue-200",          Icon: Truck },
  delivered:  { label: "تم الاستلام",   color: "emerald", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
};

export const CHART_GRADIENTS = [
  "from-turquoise to-deep-blue",
  "from-deep-blue to-violet-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
];
