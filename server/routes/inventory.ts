import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public — returns which products/colors are out of stock (qty === 0)
router.get("/public", async (_req, res) => {
  const db = await readDb();
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
router.get("/", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json(db.inventory);
});

// Protected — update product quantity
router.patch("/:slug", requireAuth, async (req, res) => {
  const { qty } = req.body as { qty?: number };
  if (typeof qty !== "number" || qty < 0) {
    res.status(400).json({ error: "qty must be a non-negative number" });
    return;
  }
  const slug = String(req.params.slug);
  const db = await readDb();
  const existing = db.inventory.find((e) => e.slug === slug);
  if (existing) {
    existing.qty = qty;
  } else {
    db.inventory.push({ slug, qty });
  }
  await writeDb(db);
  res.json({ success: true });
});

// Protected — update a specific color quantity
router.patch("/:slug/colors/:colorId", requireAuth, async (req, res) => {
  const { qty } = req.body as { qty?: number };
  if (typeof qty !== "number" || qty < 0) {
    res.status(400).json({ error: "qty must be a non-negative number" });
    return;
  }
  const slug = String(req.params.slug);
  const colorId = String(req.params.colorId);
  const db = await readDb();
  const existing = db.inventory.find((e) => e.slug === slug);
  if (existing) {
    if (!existing.colorQty) existing.colorQty = {};
    existing.colorQty[colorId] = qty;
  } else {
    db.inventory.push({ slug, qty: 0, colorQty: { [colorId]: qty } });
  }
  await writeDb(db);
  res.json({ success: true });
});

export default router;
