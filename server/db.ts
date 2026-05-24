import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { DbData, FreeShippingWindow } from "./types.js";

type DbDataRaw = Omit<DbData, "freeShipping"> & { freeShipping?: FreeShippingWindow };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, "../data/db.json");

const EMPTY_PRICING = { products: [], bundles: [], promoCodes: [] };
const DEFAULT: DbData = { orders: [], inventory: [], pricing: EMPTY_PRICING, freeShipping: null };

export function readDb(): DbData {
  try {
    if (!fs.existsSync(DB_FILE)) return { ...DEFAULT };
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as DbDataRaw;
    if (!data.pricing) data.pricing = { ...EMPTY_PRICING };
    return { ...data, freeShipping: data.freeShipping ?? null };
  } catch {
    return { ...DEFAULT };
  }
}

export function writeDb(data: DbData): void {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}
