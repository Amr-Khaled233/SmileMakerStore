import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public — is free shipping currently active?
router.get("/free-shipping/public", (_req, res) => {
  const db = readDb();
  const w = db.freeShipping;
  if (!w) { res.json({ active: false }); return; }
  const now = Date.now();
  const active = new Date(w.from).getTime() <= now && now <= new Date(w.to).getTime();
  res.json({ active });
});

// Protected — get full window config
router.get("/free-shipping", requireAuth, (_req, res) => {
  const db = readDb();
  res.json(db.freeShipping ?? null);
});

// Protected — set window
router.put("/free-shipping", requireAuth, (req, res) => {
  const { from, to } = req.body as { from?: string; to?: string };
  if (!from || !to || isNaN(new Date(from).getTime()) || isNaN(new Date(to).getTime())) {
    res.status(400).json({ error: "from و to مطلوبان وصالحان" });
    return;
  }
  if (new Date(from).getTime() >= new Date(to).getTime()) {
    res.status(400).json({ error: "from يجب أن يكون قبل to" });
    return;
  }
  const db = readDb();
  db.freeShipping = { from, to };
  writeDb(db);
  res.json({ success: true });
});

// Protected — clear window
router.delete("/free-shipping", requireAuth, (_req, res) => {
  const db = readDb();
  db.freeShipping = null;
  writeDb(db);
  res.json({ success: true });
});

export default router;
