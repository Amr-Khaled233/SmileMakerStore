import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public — raw DB pricing overrides (frontend merges with static defaults).
// Commission fields (doctor/report names & percentages) are stripped so they
// never reach the public order page.
router.get("/public", async (_req, res) => {
  const db = await readDb();
  res.json({
    ...db.pricing,
    promoCodes: db.pricing.promoCodes.map((p) => ({ code: p.code, pct: p.pct, label: p.label })),
  });
});

// Protected — same data, for manager dashboard
router.get("/", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json(db.pricing);
});

// Protected — update product price / salePrice
router.patch("/products/:slug", requireAuth, async (req, res) => {
  const slug = String(req.params.slug);
  const { price, salePrice } = req.body as { price?: number; salePrice?: number | null };
  if (price === undefined || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }
  const db = await readDb();
  const existing = db.pricing.products.find((p) => p.slug === slug);
  if (existing) {
    existing.price = price;
    existing.salePrice = salePrice === undefined ? existing.salePrice : salePrice;
  } else {
    db.pricing.products.push({ slug, price, salePrice: salePrice ?? null });
  }
  await writeDb(db);
  res.json({ success: true });
});

// Protected — set fixed bundle price
router.patch("/bundles/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const { price } = req.body as { price?: number };
  if (price === undefined || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Invalid price" });
    return;
  }
  const db = await readDb();
  const existing = db.pricing.bundles.find((b) => b.id === id);
  if (existing) {
    existing.price = price;
  } else {
    db.pricing.bundles.push({ id, price });
  }
  await writeDb(db);
  res.json({ success: true });
});

// Protected — create or update a promo code
router.post("/promoCodes", requireAuth, async (req, res) => {
  const { code, pct, label, doctorName, doctorPct, reportName, reportPct } = req.body as {
    code?: string;
    pct?: number;
    label?: string;
    doctorName?: string;
    doctorPct?: number;
    reportName?: string;
    reportPct?: number;
  };
  if (!code || pct === undefined || typeof pct !== "number" || pct <= 0 || pct > 100 || !label) {
    res.status(400).json({ error: "Missing or invalid fields" });
    return;
  }

  // Normalize the optional commission fields. A commission only exists when a
  // name is provided; the percentage falls back to a sensible default.
  const cleanDoctorName = typeof doctorName === "string" ? doctorName.trim() : "";
  const cleanReportName = typeof reportName === "string" ? reportName.trim() : "";
  const normPct = (v: unknown, fallback: number) => {
    const n = Number(v);
    return !isNaN(n) && n > 0 && n <= 100 ? n : fallback;
  };

  const entry = {
    code: code.trim().toUpperCase(),
    pct,
    label: label.trim(),
    ...(cleanDoctorName ? { doctorName: cleanDoctorName, doctorPct: normPct(doctorPct, 10) } : {}),
    ...(cleanReportName ? { reportName: cleanReportName, reportPct: normPct(reportPct, 5) } : {}),
  };

  const db = await readDb();
  const idx = db.pricing.promoCodes.findIndex((p) => p.code === entry.code);
  if (idx !== -1) {
    db.pricing.promoCodes[idx] = entry;
  } else {
    db.pricing.promoCodes.push(entry);
  }
  await writeDb(db);
  res.json({ success: true });
});

// Protected — delete a promo code
router.delete("/promoCodes/:code", requireAuth, async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const db = await readDb();
  const idx = db.pricing.promoCodes.findIndex((p) => p.code === code);
  if (idx === -1) {
    res.status(404).json({ error: "Promo code not found" });
    return;
  }
  db.pricing.promoCodes.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

export default router;
