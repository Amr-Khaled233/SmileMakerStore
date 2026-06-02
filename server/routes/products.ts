import { Router } from "express";
import { randomUUID } from "crypto";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadImage, uploadImages } from "../lib/cloudinary.js";
import type { DynamicProduct, StaticProductOverride, BundleOverride, InventoryEntry } from "../types.js";

const router = Router();

// ── Public endpoints ──────────────────────────────────────────────────────────

// List all dynamic products
router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.dynamicProducts ?? []);
});

// Get image overrides + hidden flags + text overrides + bundle overrides (public)
router.get("/meta", async (_req, res) => {
  const db = await readDb();
  res.json({
    imageOverrides: db.productImageOverrides ?? {},
    hidden: db.productHidden ?? [],
    staticOverrides: db.staticOverrides ?? {},
    bundleOverrides: db.bundleOverrides ?? {},
  });
});

// Update bundle override (protected)
router.patch("/bundles/:id", requireAuth, async (req, res) => {
  const { titleEn, titleAr, taglineEn, taglineAr, items, discountPct } = req.body as Partial<BundleOverride>;
  const db = await readDb();
  if (!db.bundleOverrides[req.params.id]) db.bundleOverrides[req.params.id] = {};
  const ov = db.bundleOverrides[req.params.id];
  if (titleEn !== undefined) ov.titleEn = titleEn || undefined;
  if (titleAr !== undefined) ov.titleAr = titleAr || undefined;
  if (taglineEn !== undefined) ov.taglineEn = taglineEn || undefined;
  if (taglineAr !== undefined) ov.taglineAr = taglineAr || undefined;
  if (Array.isArray(items)) ov.items = items;
  if (typeof discountPct === "number" && discountPct >= 0 && discountPct <= 100) ov.discountPct = discountPct;
  await writeDb(db);
  res.json({ success: true });
});

// ── Dynamic product CRUD (protected) ─────────────────────────────────────────

router.post("/", requireAuth, async (req, res) => {
  const { title, titleAr, slug, price, salePrice, description, descriptionAr, features, colors } =
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
    colors: Array.isArray(colors) && colors.length > 0 ? colors : undefined,
    outOfStock: false,
  };
  const invEntry: InventoryEntry = { slug: cleanSlug, qty: 0 };
  if (product.colors?.length) {
    invEntry.colorQty = Object.fromEntries(product.colors.map((c) => [c.id, 0]));
  }
  db.dynamicProducts.push(product);
  db.inventory.push(invEntry);
  await writeDb(db);
  res.json({ success: true, product });
});

router.delete("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const idx = db.dynamicProducts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  const product = db.dynamicProducts[idx];
  db.dynamicProducts.splice(idx, 1);
  db.inventory = db.inventory.filter((e) => e.slug !== product.slug);
  await writeDb(db);
  res.json({ success: true });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  const { outOfStock, price, salePrice, title, titleAr, description, descriptionAr, features, colors } =
    req.body as Partial<DynamicProduct>;
  if (outOfStock !== undefined) product.outOfStock = outOfStock;
  if (typeof price === "number" && price >= 0) product.price = price;
  if (salePrice !== undefined) product.salePrice = typeof salePrice === "number" && salePrice > 0 ? salePrice : undefined;
  if (title) product.title = title.trim();
  if (titleAr) product.titleAr = titleAr.trim();
  if (description !== undefined) product.description = description?.trim();
  if (descriptionAr !== undefined) product.descriptionAr = descriptionAr?.trim();
  if (Array.isArray(features)) product.features = features;
  if (Array.isArray(colors)) {
    product.colors = colors.length > 0 ? colors : undefined;
    const inv = db.inventory.find((e) => e.slug === product.slug);
    if (inv) {
      if (colors.length > 0) {
        inv.colorQty = inv.colorQty ?? {};
        for (const c of colors) {
          if (!(c.id in inv.colorQty)) inv.colorQty[c.id] = 0;
        }
        const validIds = new Set(colors.map((c) => c.id));
        for (const id of Object.keys(inv.colorQty)) {
          if (!validIds.has(id)) delete inv.colorQty[id];
        }
      } else {
        inv.colorQty = undefined;
      }
    }
  }
  await writeDb(db);
  res.json({ success: true });
});

// Dynamic product images
router.post("/:id/images", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const url = await uploadImage(image);
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  product.images.push(url);
  await writeDb(db);
  res.json({ success: true });
});

// Set / replace primary image (always index 0)
router.put("/:id/images/primary", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const url = await uploadImage(image);
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (product.images.length === 0) product.images.push(url);
  else product.images[0] = url;
  await writeDb(db);
  res.json({ success: true });
});

// Move image at :idx to index 0 (set as primary, no re-upload)
router.patch("/:id/images/:idx/primary", requireAuth, async (req, res) => {
  const idx = Number(req.params.idx);
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  const [img] = product.images.splice(idx, 1);
  product.images.unshift(img);
  await writeDb(db);
  res.json({ success: true });
});

// Replace image at :idx (upload new one)
router.put("/:id/images/:idx", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const idx = Number(req.params.idx);
  const url = await uploadImage(image);
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  product.images[idx] = url;
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

// Set the entire custom images array at once (accepts base64 or asset URLs)
router.put("/static/:slug/images", requireAuth, async (req, res) => {
  const { images } = req.body as { images?: string[] };
  if (!Array.isArray(images)) { res.status(400).json({ error: "images must be an array" }); return; }
  const urls = await uploadImages(images.filter(Boolean));
  const db = await readDb();
  db.productImageOverrides[req.params.slug] = urls;
  await writeDb(db);
  res.json({ success: true });
});

// Add image override to a static product
router.post("/static/:slug/images", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const url = await uploadImage(image);
  const db = await readDb();
  if (!db.productImageOverrides[req.params.slug]) db.productImageOverrides[req.params.slug] = [];
  db.productImageOverrides[req.params.slug].push(url);
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

// Set a specific custom image as primary (move to index 0)
router.patch("/static/:slug/images/:idx/primary", requireAuth, async (req, res) => {
  const idx = Number(req.params.idx);
  const db = await readDb();
  const imgs = db.productImageOverrides[req.params.slug];
  if (!imgs || isNaN(idx) || idx < 0 || idx >= imgs.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  const [img] = imgs.splice(idx, 1);
  imgs.unshift(img);
  await writeDb(db);
  res.json({ success: true });
});

// Replace a specific custom image by index
router.put("/static/:slug/images/:idx", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const idx = Number(req.params.idx);
  const url = await uploadImage(image);
  const db = await readDb();
  const imgs = db.productImageOverrides[req.params.slug];
  if (!imgs || isNaN(idx) || idx < 0 || idx >= imgs.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  imgs[idx] = url;
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

// Update text details (description, tagline, features, colors, related) for a static product
router.patch("/static/:slug/details", requireAuth, async (req, res) => {
  const { description, descriptionAr, taglineEn, taglineAr, features, colors, related } = req.body as Partial<StaticProductOverride>;
  const db = await readDb();
  if (!db.staticOverrides[req.params.slug]) db.staticOverrides[req.params.slug] = {};
  const ov = db.staticOverrides[req.params.slug];
  if (description !== undefined) ov.description = description?.trim() || undefined;
  if (descriptionAr !== undefined) ov.descriptionAr = descriptionAr?.trim() || undefined;
  if (taglineEn !== undefined) ov.taglineEn = taglineEn?.trim() || undefined;
  if (taglineAr !== undefined) ov.taglineAr = taglineAr?.trim() || undefined;
  if (Array.isArray(features)) ov.features = features;
  if (Array.isArray(colors)) ov.colors = colors.length > 0 ? colors : undefined;
  if (Array.isArray(related)) ov.related = related.length > 0 ? related : undefined;
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
