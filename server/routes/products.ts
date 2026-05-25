import { Router } from "express";
import { randomUUID } from "crypto";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { DynamicProduct } from "../types.js";

const router = Router();

// Public — list all dynamic products (no images to keep response small)
router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.dynamicProducts ?? []);
});

// Protected — create product
router.post("/", requireAuth, async (req, res) => {
  const { title, titleAr, slug, price, salePrice } = req.body as Partial<DynamicProduct>;
  if (!title || !titleAr || !slug || typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const db = await readDb();
  if (db.dynamicProducts.some((p) => p.slug === slug)) {
    res.status(400).json({ error: "Slug already exists" });
    return;
  }
  const product: DynamicProduct = {
    id: randomUUID(),
    slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
    title: title.trim(),
    titleAr: titleAr.trim(),
    price,
    salePrice: typeof salePrice === "number" && salePrice > 0 ? salePrice : undefined,
    images: [],
    outOfStock: false,
  };
  db.dynamicProducts.push(product);
  await writeDb(db);
  res.json({ success: true, product });
});

// Protected — delete product
router.delete("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const idx = db.dynamicProducts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  db.dynamicProducts.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

// Protected — toggle out-of-stock
router.patch("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  const { outOfStock, price, salePrice } = req.body as Partial<DynamicProduct>;
  if (outOfStock !== undefined) product.outOfStock = outOfStock;
  if (typeof price === "number" && price >= 0) product.price = price;
  if (salePrice !== undefined) product.salePrice = typeof salePrice === "number" && salePrice > 0 ? salePrice : undefined;
  await writeDb(db);
  res.json({ success: true });
});

// Protected — add image (base64 data URL)
router.post("/:id/images", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" });
    return;
  }
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  product.images.push(image);
  await writeDb(db);
  res.json({ success: true });
});

// Protected — remove image by index
router.delete("/:id/images/:idx", requireAuth, async (req, res) => {
  const idx = Number(req.params.idx);
  const db = await readDb();
  const product = db.dynamicProducts.find((p) => p.id === req.params.id);
  if (!product) { res.status(404).json({ error: "Not found" }); return; }
  if (isNaN(idx) || idx < 0 || idx >= product.images.length) {
    res.status(400).json({ error: "Invalid image index" }); return;
  }
  product.images.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

export default router;
