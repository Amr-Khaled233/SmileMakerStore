import { Router } from "express";
import { readDb, writeDb, withLock } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { orderLimiter } from "../middleware/rateLimit.js";
import type { Order } from "../types.js";

const router = Router();

const MAX_ITEMS = 50; // a real cart never has more lines than this
const MAX_QTY = 999; // per-line quantity cap

// Validate a public order payload to block malformed / abusive submissions.
// Returns an error message, or null if the order looks sane.
function validateOrderBody(body: Omit<Order, "createdAt" | "status">): string | null {
  if (!body.id || typeof body.id !== "string" || body.id.length > 40) return "Invalid id";
  if (!body.name || typeof body.name !== "string" || body.name.length > 100) return "Invalid name";
  if (!body.phone || typeof body.phone !== "string" || body.phone.length > 20) return "Invalid phone";
  if (!Array.isArray(body.items) || body.items.length === 0) return "No items";
  if (body.items.length > MAX_ITEMS) return "Too many items";
  for (const it of body.items) {
    if (!it || typeof it.slug !== "string" || typeof it.title !== "string") return "Invalid item";
    if (typeof it.qty !== "number" || !Number.isFinite(it.qty) || it.qty < 1 || it.qty > MAX_QTY) return "Invalid quantity";
    if (typeof it.lineTotal !== "number" || !Number.isFinite(it.lineTotal) || it.lineTotal < 0) return "Invalid line total";
  }
  if (typeof body.total !== "number" || !Number.isFinite(body.total) || body.total < 0 || body.total > 10_000_000) return "Invalid total";
  return null;
}

function deductInventory(
  db: Awaited<ReturnType<typeof readDb>>,
  items: Order["items"],
  multiplier: 1 | -1 = 1 // 1 = deduct, -1 = restore
) {
  for (const item of items) {
    const entry = db.inventory.find((e) => e.slug === item.slug);
    if (!entry) continue;

    entry.qty = Math.max(0, entry.qty - item.qty * multiplier);

    if (item.colorId && entry.colorQty) {
      const cur = entry.colorQty[item.colorId] ?? 0;
      entry.colorQty[item.colorId] = Math.max(0, cur - item.qty * multiplier);
    }
  }
}

// Public — create order from checkout (rate-limited + validated)
router.post("/", orderLimiter, async (req, res) => {
  const body = req.body as Omit<Order, "createdAt" | "status">;
  const invalid = validateOrderBody(body);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  const order: Order = { ...body, createdAt: Date.now(), status: "pending" };
  let duplicate = false;
  await withLock(async () => {
    const db = await readDb();
    // Reject duplicate IDs (double-submit / replay).
    if (db.orders.some((o) => o.id === order.id)) { duplicate = true; return; }
    // Snapshot referral commission from the promo definition (server-side, so
    // the client can't forge it and later promo edits don't affect this order).
    if (order.promoCode) {
      const promo = db.pricing.promoCodes.find((p) => p.code === order.promoCode);
      if (promo?.doctorName) {
        order.promoDoctorName = promo.doctorName;
        order.promoDoctorPct = promo.doctorPct ?? 10;
      }
      if (promo?.reportName) {
        order.promoReportName = promo.reportName;
        order.promoReportPct = promo.reportPct ?? 5;
      }
    }
    db.orders.unshift(order);
    if (order.items?.length) deductInventory(db, order.items);
    await writeDb(db);
  });
  if (duplicate) { res.status(409).json({ error: "Order already exists" }); return; }
  res.json({ success: true, id: order.id });
});

// Protected — list all orders
router.get("/", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json(db.orders);
});

// Protected — update order status, total, notes, and/or items
router.patch("/:id", requireAuth, async (req, res) => {
  const body = req.body as {
    status?: string;
    total?: number;
    notes?: string;
    items?: Order["items"];
    subtotal?: number;
    bundleDiscount?: number;
    promoDiscount?: number;
    shippingFee?: number;
  };

  let notFound = false;
  let invalidStatus = false;
  let nothingChanged = false;

  await withLock(async () => {
    const db = await readDb();
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) { notFound = true; return; }

    let changed = false;

    if (body.status !== undefined) {
      const VALID = ["pending", "dispatched", "delivered"];
      if (!VALID.includes(body.status)) { invalidStatus = true; return; }
      order.status = body.status as Order["status"];
      changed = true;
    }

    if (body.items !== undefined && Array.isArray(body.items)) {
      deductInventory(db, order.items, -1);
      order.items = body.items;
      deductInventory(db, order.items, 1);
      if (body.subtotal !== undefined) order.subtotal = body.subtotal;
      if (body.bundleDiscount !== undefined) order.bundleDiscount = body.bundleDiscount;
      if (body.promoDiscount !== undefined) order.promoDiscount = body.promoDiscount;
      changed = true;
    }

    if (body.shippingFee !== undefined) {
      const sf = Number(body.shippingFee);
      if (!isNaN(sf) && sf >= 0) { order.shippingFee = sf; changed = true; }
    }

    if (body.total !== undefined) {
      const t = Number(body.total);
      if (!isNaN(t) && t >= 0) { order.total = t; changed = true; }
    }

    if ("notes" in body) {
      order.notes = (body.notes ?? "").trim() || undefined;
      changed = true;
    }

    if (!changed) { nothingChanged = true; return; }

    await writeDb(db);
  });

  if (notFound) { res.status(404).json({ error: "Order not found" }); return; }
  if (invalidStatus) { res.status(400).json({ error: "Invalid status" }); return; }
  if (nothingChanged) { res.status(400).json({ error: "Nothing to update" }); return; }
  res.json({ success: true });
});

// Protected — delete order and restore inventory
router.delete("/:id", requireAuth, async (req, res) => {
  let notFound = false;
  await withLock(async () => {
    const db = await readDb();
    const idx = db.orders.findIndex((o) => o.id === req.params.id);
    if (idx === -1) { notFound = true; return; }
    const [order] = db.orders.splice(idx, 1);
    deductInventory(db, order.items, -1);
    await writeDb(db);
  });
  if (notFound) { res.status(404).json({ error: "Order not found" }); return; }
  res.json({ success: true });
});

export default router;
