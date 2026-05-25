import { Router } from "express";
import { randomUUID } from "crypto";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { DynamicProduct } from "../types.js";

const router = Router();

// ── Public endpoints ──────────────────────────────────────────────────────────

// List all dynamic products
router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.dynamicProducts ?? []);
});

// Get image overrides + hidden flags (public, used by frontend pages)
router.get("/meta", async (_req, res) => {
  const db = await readDb();
  res.json({
    imageOverrides: db.productImageOverrides ?? {},
    hidden: db.productHidden ?? [],
  });
});

// ── Dynamic product CRUD (protected) ─────────────────────────────────────────

router.post("/", requireAuth, async (req, res) => {
  const { title, titleAr, slug, price, salePrice, description, descriptionAr, features } =
    req.body as Partial<DynamicProduct>;
  if (!title || !titleAr || !slug || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const db = await readDb();
  const cleanSlug = slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (db.dynamicProducts.some((p) => p.slug === cleanSlug)) {
    res.status(400).json({ error: "Slug already exists" }); return;
  }
  const product: DynamicProduct = {
    id: randomUUID(),
    slug: cleanSlug,
    title: title.trim(),
    titleAr: titleAr.trim(),
    description: description?.trim(),
    descriptionAr: descriptionAr?.trim(),
    features: Array.isArray(features) ? features : [],
    price,
    salePrice: typeof salePrice === "number" && salePrice > 0 ? salePrice : undefined,
    images: [],
    outOfStock: false,
  };
  db.dynamicProducts.push(product);
  await writeDb(db);
  res.json({ success: true, product });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const idx = db.dynamicProducts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  db.dynamicProducts.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  const { outOfStock, price, salePrice, title, titleAr, description, descriptionAr, features } =
    req.body as Partial<DynamicProduct>;
  if (outOfStock !== undefined) product.outOfStock = outOfStock;
  if (typeof price === "number" && price >= 0) product.price = price;
  if (salePrice !== undefined) product.salePrice = typeof salePrice === "number" && salePrice > 0 ? salePrice : undefined;
  if (title) product.title = title.trim();
  if (titleAr) product.titleAr = titleAr.trim();
  if (description !== undefined) product.description = description?.trim();
  if (descriptionAr !== undefined) product.descriptionAr = descriptionAr?.trim();
  if (Array.isArray(features)) product.features = features;
  await writeDb(db);
  res.json({ success: true });
});

// Dynamic product images
router.post("/:id/images", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  product.images.push(image);
  await writeDb(db);
  res.json({ success: true });
});

router.delete("/:id/images/:idx", requireAuth, async (req, res) => {
  const idx = Number(req.params.idx);
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  product.images.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

// ── Static product management (protected) ────────────────────────────────────

// Add image override to a static product
router.post("/static/:slug/images", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const db = await readDb();
  if (!db.productImageOverrides[req.params.slug]) db.productImageOverrides[req.params.slug] = [];
  db.productImageOverrides[req.params.slug].push(image);
  await writeDb(db);
  res.json({ success: true });
});

// Remove image override from a static product
router.delete("/static/:slug/images/:idx", requireAuth, async (req, res) => {
  const idx = Number(req.params.idx);
  const db = await readDb();
  const imgs = db.productImageOverrides[req.params.slug];
  if (!imgs || isNaN(idx) || idx < 0 || idx >= imgs.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  imgs.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

// Clear all image overrides for a static product (restore originals)
router.delete("/static/:slug/images", requireAuth, async (req, res) => {
  const db = await readDb();
  delete db.productImageOverrides[req.params.slug];
  await writeDb(db);
  res.json({ success: true });
});

// Hide / show a static product
router.patch("/static/:slug/visibility", requireAuth, async (req, res) => {
  const { hidden } = req.body as { hidden?: boolean };
  const db = await readDb();
  if (hidden) {
    if (!db.productHidden.includes(req.params.slug)) db.productHidden.push(req.params.slug);
  } else {
    db.productHidden = db.productHidden.filter((s) => s !== req.params.slug);
  }
  await writeDb(db);
  res.json({ success: true });
});

export default router;
