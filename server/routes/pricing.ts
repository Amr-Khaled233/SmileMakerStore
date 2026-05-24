import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public — raw DB pricing overrides (frontend merges with static defaults)
router.get("/public", (_req, res) => {
  const db = readDb();
  res.json(db.pricing);
});

// Protected — same data, for manager dashboard
router.get("/", requireAuth, (_req, res) => {
  const db = readDb();
  res.json(db.pricing);
});

// Protected — update product price / salePrice
router.patch("/products/:slug", requireAuth, (req, res) => {
  const { slug } = req.params;
  const { price, salePrice } = req.body as { price?: number; salePrice?: number | null };
  if (price === undefined || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }
  const db = readDb();
  const existing = db.pricing.products.find((p) => p.slug === slug);
  if (existing) {
    existing.price = price;
    existing.salePrice = salePrice === undefined ? existing.salePrice : salePrice;
  } else {
    db.pricing.products.push({ slug, price, salePrice: salePrice ?? null });
  }
  writeDb(db);
  res.json({ success: true });
});

// Protected — set fixed bundle price
router.patch("/bundles/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { price } = req.body as { price?: number };
  if (price === undefined || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }
  const db = readDb();
  const existing = db.pricing.bundles.find((b) => b.id === id);
  if (existing) {
    existing.price = price;
  } else {
    db.pricing.bundles.push({ id, price });
  }
  writeDb(db);
  res.json({ success: true });
});

// Protected — create or update a promo code
router.post("/promoCodes", requireAuth, (req, res) => {
  const { code, pct, label } = req.body as { code?: string; pct?: number; label?: string };
  if (!code || pct === undefined || typeof pct !== "number" || pct <= 0 || pct > 100 || !label) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }
  const normalCode = code.trim().toUpperCase();
  const db = readDb();
  const existing = db.pricing.promoCodes.find((p) => p.code === normalCode);
  if (existing) {
    existing.pct = pct;
    existing.label = label.trim();
  } else {
    db.pricing.promoCodes.push({ code: normalCode, pct, label: label.trim() });
  }
  writeDb(db);
  res.json({ success: true });
});

// Protected — delete a promo code
router.delete("/promoCodes/:code", requireAuth, (req, res) => {
  const code = req.params.code.toUpperCase();
  const db = readDb();
  const idx = db.pricing.promoCodes.findIndex((p) => p.code === code);
  if (idx === -1) {
    res.status(404).json({ error: "Promo code not found" });
    return;
  }
  db.pricing.promoCodes.splice(idx, 1);
  writeDb(db);
  res.json({ success: true });
});

export default router;
