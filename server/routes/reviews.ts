import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadImage } from "../lib/cloudinary.js";

const router = Router();

// Public: get all review images
router.get("/", async (_req, res) => {
  const db = await readDb();
  res.json(db.reviewImages ?? []);
});

// Protected: add a review image
router.post("/", requireAuth, async (req, res) => {
  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "Invalid image data" }); return;
  }
  const url = await uploadImage(image);
  const db = await readDb();
  db.reviewImages.push(url);
  await writeDb(db);
  res.json({ success: true });
});

// Protected: delete a review image by index
router.delete("/:idx", requireAuth, async (req, res) => {
  const idx = Number(req.params.idx);
  const db = await readDb();
  if (isNaN(idx) || idx < 0 || idx >= db.reviewImages.length) {
    res.status(400).json({ error: "Invalid index" }); return;
  }
  db.reviewImages.splice(idx, 1);
  await writeDb(db);
  res.json({ success: true });
});

export default router;
