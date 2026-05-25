import "dotenv/config";
import { MongoClient } from "mongodb";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbJson = JSON.parse(readFileSync(path.resolve(__dirname, "../data/db.json"), "utf-8"));

const uri = process.env.MONGODB_URI!;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

const client = new MongoClient(uri);
await client.connect();

const col = client.db("smilemaker").collection("state");
await col.deleteMany({});
await col.insertOne(dbJson);

console.log("✅ Migrated successfully!");
console.log("  Orders:", dbJson.orders.length);
console.log("  Inventory:", dbJson.inventory.length, "products");
console.log("  Pricing overrides:", dbJson.pricing.products.length, "products,", dbJson.pricing.bundles.length, "bundles");

await client.close();
