import { MongoClient, type Db } from "mongodb";
import type { DbData, FreeShippingWindow } from "./types.js";

class Mutex {
  private _queue: Promise<void> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    let unlock!: () => void;
    const next = new Promise<void>((resolve) => { unlock = resolve; });
    const result = this._queue.then(() => fn()).finally(() => unlock());
    this._queue = next;
    return result;
  }
}

const _mutex = new Mutex();
export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  return _mutex.run(fn);
}

type DbDataRaw = Omit<DbData, "freeShipping"> & { freeShipping?: FreeShippingWindow };

const EMPTY_PRICING = { products: [], bundles: [], promoCodes: [] };
const DEFAULT: DbData = { orders: [], inventory: [], pricing: EMPTY_PRICING, freeShipping: null, dynamicProducts: [], dynamicBundles: [], productImageOverrides: {}, productHidden: [], staticOverrides: {}, bundleOverrides: {}, reviewImages: [] };

let _client: MongoClient | null = null;
let _db: Db | null = null;

async function getCol() {
  if (!_db) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI environment variable is not set");
    _client = new MongoClient(uri);
    await _client.connect();
    _db = _client.db("smilemaker");
  }
  return _db.collection<DbDataRaw>("state");
}

export async function readDb(): Promise<DbData> {
  const col = await getCol();
  const doc = await col.findOne({}, { projection: { _id: 0 } });
  if (!doc) return { ...DEFAULT };
  const data = doc as DbDataRaw;
  if (!data.pricing) data.pricing = { ...EMPTY_PRICING };
  if (!data.dynamicProducts) data.dynamicProducts = [];
  if (!data.productImageOverrides) data.productImageOverrides = {};
  if (!data.productHidden) data.productHidden = [];
  if (!data.staticOverrides) data.staticOverrides = {};
  if (!data.bundleOverrides) data.bundleOverrides = {};
  if (!data.dynamicBundles) data.dynamicBundles = [];
  if (!data.reviewImages) data.reviewImages = [];
  return { ...data, freeShipping: data.freeShipping ?? null };
}

export async function writeDb(data: DbData): Promise<void> {
  const col = await getCol();
  await col.replaceOne({}, data as DbDataRaw, { upsert: true });
}
