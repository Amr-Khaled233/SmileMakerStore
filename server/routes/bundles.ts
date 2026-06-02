import { Router } from "express";
import { randomUUID } from "crypto";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { DynamicBundle } from "../types.js";

const router = Router();

// Public: list all user-created bundles
router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.dynamicBundles ?? []);
});

// Protected: create a new bundle
router.post("/", requireAuth, async (req, res) => {
  const { titleEn, titleAr, taglineEn, taglineAr, items, price } = req.body as Partial<DynamicBundle>;
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
  const { titleEn, titleAr, taglineEn, taglineAr, items, price } = req.body as Partial<DynamicBundle>;
  if (titleEn) bundle.titleEn = titleEn.trim();
  if (titleAr) bundle.titleAr = titleAr.trim();
  if (taglineEn !== undefined) bundle.taglineEn = taglineEn?.trim() || undefined;
  if (taglineAr !== undefined) bundle.taglineAr = taglineAr?.trim() || undefined;
  if (Array.isArray(items) && items.length > 0) bundle.items = items;
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
