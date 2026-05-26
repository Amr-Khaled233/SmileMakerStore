import { Router } from "express";
import { readDb, writeDb, withLock } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { Order } from "../types.js";

const router = Router();

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

// Public — create order from checkout
router.post("/", async (req, res) => {
  const body = req.body as Omit<Order, "createdAt" | "status">;
  if (!body.id || !body.name || !body.phone) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const order: Order = { ...body, createdAt: Date.now(), status: "pending" };
  await withLock(async () => {
    const db = await readDb();
    db.orders.unshift(order);
    if (order.items?.length) deductInventory(db, order.items);
    await writeDb(db);
  });
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
