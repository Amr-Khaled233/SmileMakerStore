import { Router } from "express";
import { randomUUID } from "crypto";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { DynamicBundle } from "../types.js";

const router = Router();

// Keep only quantities for slugs that are in the bundle, coerced to a whole
// number >= 1. We only store values > 1 since 1 is the implicit default.
// Returns undefined when nothing meaningful remains.
function sanitizeQuantities(
  quantities: Record<string, number> | undefined,
  items: string[],
): Record<string, number> | undefined {
  if (!quantities || typeof quantities !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const slug of items) {
    const n = Math.floor(Number(quantities[slug]));
    if (Number.isFinite(n) && n > 1) out[slug] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// Public: list all user-created bundles
router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.dynamicBundles ?? []);
});

// Protected: create a new bundle
router.post("/", requireAuth, async (req, res) => {
  const { titleEn, titleAr, taglineEn, taglineAr, items, quantities, price } = req.body as Partial<DynamicBundle>;
  if (!titleEn || !titleAr || !Array.isArray(items) || items.length === 0 || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const db = await readDb();
  const bundle: DynamicBundle = {
    id: randomUUID(),
    titleEn: titleEn.trim(),
    titleAr: titleAr.trim(),
    taglineEn: taglineEn?.trim() || undefined,
    taglineAr: taglineAr?.trim() || undefined,
    items,
    quantities: sanitizeQuantities(quantities, items),
    price,
  };
  db.dynamicBundles.push(bundle);
  await writeDb(db);
  res.json({ success: true, bundle });
});

// Protected: update a bundle
router.patch("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const bundle = db.dynamicBundles.find((b) => b.id === req.params.id);
  if (!bundle) { res.status(404).json({ error: "Not found" }); return; }
  const { titleEn, titleAr, taglineEn, taglineAr, items, quantities, price } = req.body as Partial<DynamicBundle>;
  if (titleEn) bundle.titleEn = titleEn.trim();
  if (titleAr) bundle.titleAr = titleAr.trim();
  if (taglineEn !== undefined) bundle.taglineEn = taglineEn?.trim() || undefined;
  if (taglineAr !== undefined) bundle.taglineAr = taglineAr?.trim() || undefined;
  if (Array.isArray(items) && items.length > 0) bundle.items = items;
  // Re-sanitize against the (possibly updated) item list so removed items drop their qty.
  if (quantities !== undefined || Array.isArray(items)) {
    bundle.quantities = sanitizeQuantities(quantities ?? bundle.quantities, bundle.items);
  }
  if (typeof price === "number" && price >= 0) bundle.price = price;
  await writeDb(db);
  res.json({ success: true });
});

// Protected: delete a bundle
router.delete("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const idx = db.dynamicBundles.findIndex((b) => b.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  db.dynamicBundles.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

export default router;
