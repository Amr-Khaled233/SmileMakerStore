import { Router } from "express";
import { readDb, writeDb, withLock } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import type { DbData } from "../types.js";

const router = Router();

type Party = "doctor" | "report";

export type CommissionLine = {
  key: string; // `${orderId}:${party}`
  orderId: string;
  party: Party;
  name: string;
  pct: number;
  orderTotal: number;
  date: number; // order creation time
  amount: number; // override if set, else computed
  computedAmount: number;
  overridden: boolean;
  paid: boolean;
  paidAt?: number;
};

// Expand orders into commission lines, merging in mutable manager state.
// Archived lines are omitted.
function buildLines(db: DbData): CommissionLine[] {
  const out: CommissionLine[] = [];
  for (const o of db.orders) {
    const parties: { party: Party; name?: string; pct?: number }[] = [
      { party: "doctor", name: o.promoDoctorName, pct: o.promoDoctorPct },
      { party: "report", name: o.promoReportName, pct: o.promoReportPct },
    ];
    for (const p of parties) {
      if (!p.name || !p.pct) continue;
      const key = `${o.id}:${p.party}`;
      const st = db.commissionState[key] ?? {};
      if (st.archived) continue;
      const computedAmount = Math.round((o.total * p.pct) / 100);
      out.push({
        key,
        orderId: o.id,
        party: p.party,
        name: p.name,
        pct: p.pct,
        orderTotal: o.total,
        date: o.createdAt,
        amount: st.amountOverride ?? computedAmount,
        computedAmount,
        overridden: st.amountOverride != null,
        paid: !!st.paid,
        paidAt: st.paidAt,
      });
    }
  }
  return out.sort((a, b) => b.date - a.date);
}

// Verify a key refers to a real order+party that currently earns commission.
function keyIsValid(db: DbData, key: string): boolean {
  const [orderId, party] = key.split(":");
  const o = db.orders.find((x) => x.id === orderId);
  if (!o) return false;
  if (party === "doctor") return !!(o.promoDoctorName && o.promoDoctorPct);
  if (party === "report") return !!(o.promoReportName && o.promoReportPct);
  return false;
}

// Protected — full commission ledger
router.get("/", requireAuth, async (_req, res) => {
  const db = await readDb();
  res.json(buildLines(db));
});

// Protected — update a commission line: paid status and/or amount override
router.patch("/:key", requireAuth, async (req, res) => {
  const key = decodeURIComponent(String(req.params.key));
  const body = req.body as { paid?: boolean; amount?: number | null };

  let notFound = false;
  let invalid = false;

  await withLock(async () => {
    const db = await readDb();
    if (!keyIsValid(db, key)) { notFound = true; return; }

    const st = { ...(db.commissionState[key] ?? {}) };

    if (body.paid !== undefined) {
      st.paid = !!body.paid;
      st.paidAt = body.paid ? Date.now() : undefined;
    }

    if ("amount" in body) {
      if (body.amount === null || body.amount === undefined) {
        delete st.amountOverride; // revert to auto-computed
      } else {
        const n = Number(body.amount);
        if (isNaN(n) || n < 0) { invalid = true; return; }
        st.amountOverride = Math.round(n);
      }
    }

    db.commissionState[key] = st;
    await writeDb(db);
  });

  if (notFound) { res.status(404).json({ error: "Commission line not found" }); return; }
  if (invalid) { res.status(400).json({ error: "Invalid amount" }); return; }
  res.json({ success: true });
});

// Protected — remove a commission line from the ledger (soft archive)
router.delete("/:key", requireAuth, async (req, res) => {
  const key = decodeURIComponent(String(req.params.key));
  await withLock(async () => {
    const db = await readDb();
    db.commissionState[key] = { ...(db.commissionState[key] ?? {}), archived: true };
    await writeDb(db);
  });
  res.json({ success: true });
});

export default router;
