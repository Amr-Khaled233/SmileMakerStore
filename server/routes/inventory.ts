import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public — returns which products/colors are out of stock (qty === 0)
router.get("/public", (_req, res) => {
  const db = readDb();
  const outOfStock: string[] = [];
  const outOfStockColors: Record<string, string[]> = {};

  for (const entry of db.inventory) {
    if (entry.qty === 0) outOfStock.push(entry.slug);
    if (entry.colorQty) {
      const oosColors = Object.entries(entry.colorQty)
        .filter(([, qty]) => qty === 0)
        .map(([colorId]) => colorId);
      if (oosColors.length > 0) outOfStockColors[entry.slug] = oosColors;
    }
  }
  res.json({ outOfStock, outOfStockColors });
});

// Protected — full inventory
router.get("/", requireAuth, (_req, res) => {
  const db = readDb();
  res.json(db.inventory);
});

// Protected — update product quantity
router.patch("/:slug", requireAuth, (req, res) => {
  const { qty } = req.body as { qty?: number };
  if (typeof qty !== "number" || qty < 0) {
    res.status(400).json({ error: "qty must be a non-negative number" });
    return;
  }
  const db = readDb();
  let entry = db.inventory.find((e) => e.slug === req.params.slug);
  if (!entry) {
    entry = { slug: req.params.slug, qty };
    db.inventory.push(entry);
  } else {
    entry.qty = qty;
  }
  writeDb(db);
  res.json({ success: true });
});

// Protected — update a specific color quantity
router.patch("/:slug/colors/:colorId", requireAuth, (req, res) => {
  const { qty } = req.body as { qty?: number };
  if (typeof qty !== "number" || qty < 0) {
    res.status(400).json({ error: "qty must be a non-negative number" });
    return;
  }
  const db = readDb();
  let entry = db.inventory.find((e) => e.slug === req.params.slug);
  if (!entry) {
    entry = { slug: req.params.slug, qty: 0, colorQty: {} };
    db.inventory.push(entry);
  }
  if (!entry.colorQty) entry.colorQty = {};
  entry.colorQty[req.params.colorId] = qty;
  writeDb(db);
  res.json({ success: true });
});

export default router;
