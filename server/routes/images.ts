import { Router } from "express";
import { getImagesCol } from "../db.js";

const router = Router();

// Public — serve an image stored in MongoDB by its id.
router.get("/:id", async (req, res) => {
  try {
    const col = await getImagesCol();
    const doc = await col.findOne({ _id: String(req.params.id) });
    if (!doc) {
      res.status(404).end();
      return;
    }
    // With promoteBuffers the data is a Buffer; stay defensive just in case.
    const raw = doc.data as unknown as Buffer | { buffer: ArrayBuffer };
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from((raw as { buffer: ArrayBuffer }).buffer);
    res.setHeader("Content-Type", doc.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.end(buf);
  } catch {
    res.status(500).end();
  }
});

export default router;
