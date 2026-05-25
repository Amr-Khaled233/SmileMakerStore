// Seeds the live Vercel deployment with initial inventory & pricing data
// Run: npx tsx scripts/seed-via-api.ts

const BASE = "https://smile-maker-store.vercel.app/api";
const PASSWORD = "SmileMaker2024";

// ── 1. Login ──────────────────────────────────────────────────────
const loginRes = await fetch(`${BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: PASSWORD }),
});
const { token } = await loginRes.json() as { token: string };
if (!token) { console.error("❌ Login failed"); process.exit(1); }
console.log("✅ Logged in");

const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

// ── 2. Inventory ──────────────────────────────────────────────────
const inventory = [
  { slug: "h2o-water-flosser",         qty: 1800 },
  { slug: "ortho-oral-kit",            qty: 250,
    colors: { purple: 50, pink: 50, blue: 50, green: 50, orange: 50 } },
  { slug: "electrical-dental-brush",   qty: 45,
    colors: { pink: 15, white: 15, black: 15 } },
  { slug: "ortho-sheet",               qty: 30 },
  { slug: "l-shaped-interdental-brush", qty: 20 },
];

for (const item of inventory) {
  await fetch(`${BASE}/inventory/${item.slug}`, {
    method: "PATCH", headers: auth, body: JSON.stringify({ qty: item.qty }),
  });
  if (item.colors) {
    for (const [colorId, qty] of Object.entries(item.colors)) {
      await fetch(`${BASE}/inventory/${item.slug}/colors/${colorId}`, {
        method: "PATCH", headers: auth, body: JSON.stringify({ qty }),
      });
    }
  }
  console.log(`  ✅ ${item.slug}: ${item.qty}`);
}

// ── 3. Pricing ────────────────────────────────────────────────────
await fetch(`${BASE}/pricing/products/h2o-water-flosser`, {
  method: "PATCH", headers: auth,
  body: JSON.stringify({ price: 2000, salePrice: 1650 }),
});
console.log("  ✅ pricing: h2o-water-flosser");

const bundles = [
  { id: "ortho-care-smile", price: 1800 },
  { id: "braces-comfort",   price: 395  },
  { id: "daily-care",       price: 1990 },
];
for (const b of bundles) {
  await fetch(`${BASE}/pricing/bundles/${b.id}`, {
    method: "PATCH", headers: auth, body: JSON.stringify({ price: b.price }),
  });
  console.log(`  ✅ bundle: ${b.id} → ${b.price}`);
}

// ── 4. Promo code ─────────────────────────────────────────────────
await fetch(`${BASE}/pricing/promoCodes`, {
  method: "POST", headers: auth,
  body: JSON.stringify({ code: "ELKHOULY10", pct: 5, label: "خصم 5% علي طلبك" }),
});
console.log("  ✅ promo: ELKHOULY10");

console.log("\n🎉 Done! All data seeded on the live site.");
