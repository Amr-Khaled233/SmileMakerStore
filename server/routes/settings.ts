import { Router } from "express";
import { readDb, writeDb } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Parse a datetime string as a UTC timestamp.
// New data is stored as UTC ISO ("2026-05-25T00:58:00.000Z") → parses correctly.
// Legacy data has no TZ ("2026-05-25T03:58") → treat as Egypt local time (UTC+3).
function parseDateTime(str: string): number {
  if (!str) return NaN;
  if (str.includes("Z") || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str).getTime();
  return new Date(str + "+03:00").getTime();
}

// Public — is free shipping currently active?
router.get("/free-shipping/public", async (_req, res) => {
  const db = await readDb();
  const w = db.freeShipping;
  if (!w) { res.json({ active: false }); return; }
  const now = Date.now();
  const active = parseDateTime(w.from) <= now && now <= parseDateTime(w.to);
  res.json({ active });
});

// Protected — get full window config
router.get("/free-shipping", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json(db.freeShipping ?? null);
});

// Protected — set window
router.put("/free-shipping", requireAuth, async (req, res) => {
  const { from, to } = req.body as { from?: string; to?: string };
  if (!from || !to || isNaN(new Date(from).getTime()) || isNaN(new Date(to).getTime())) {
    res.status(400).json({ error: "from و to مطلوبان وصالحان" });
    return;
  }
  if (new Date(from).getTime() >= new Date(to).getTime()) {
    res.status(400).json({ error: "from يجب أن يكون قبل to" });
    return;
  }
  const db = await readDb();
  db.freeShipping = { from, to };
  await writeDb(db);
  res.json({ success: true });
});

// Protected — clear window
router.delete("/free-shipping", requireAuth, async (_req, res) => {
  const db = await readDb();
  db.freeShipping = null;
  await writeDb(db);
  res.json({ success: true });
});

export default router;
