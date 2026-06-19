import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { apiLimiter } from "./middleware/rateLimit.js";
import authRouter from "./routes/auth.js";
import ordersRouter from "./routes/orders.js";
import inventoryRouter from "./routes/inventory.js";
import pricingRouter from "./routes/pricing.js";
import settingsRouter from "./routes/settings.js";
import productsRouter from "./routes/products.js";
import bundlesRouter from "./routes/bundles.js";
import reviewsRouter from "./routes/reviews.js";
import carouselRouter from "./routes/carousel.js";
import commissionsRouter from "./routes/commissions.js";
import imagesRouter from "./routes/images.js";

const ALLOWED = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

// Behind nginx — trust the first proxy so rate-limiting sees real client IPs.
app.set("trust proxy", 1);

// Security headers. CSP is disabled because the SPA + Cloudinary images need a
// permissive policy; the other protections (HSTS, no-sniff, etc.) stay on.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// Gzip responses (HTML/JS/CSS/JSON) for faster page loads.
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED.includes(origin) || ALLOWED.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "15mb" }));

// Image serving — registered before the rate limiter so a page loading many
// images from the same IP doesn't get throttled. (They're cached anyway.)
app.use("/api/images", imagesRouter);

// Broad rate-limit safety net across the rest of the API.
app.use("/api", apiLimiter);

app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/products", productsRouter);
app.use("/api/bundles", bundlesRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/carousel", carouselRouter);
app.use("/api/commissions", commissionsRouter);

// Serve the built frontend from the same Node process when a build exists
// (e.g. single-server hosting like a Hostinger VPS). On platforms where the
// frontend is served separately (e.g. Vercel CDN) the dist folder isn't
// present in the function bundle, so this is skipped automatically.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
if (fs.existsSync(distDir)) {
  // Hashed build assets never change → cache them aggressively for fast repeat visits.
  app.use(
    "/assets",
    express.static(path.join(distDir, "assets"), { immutable: true, maxAge: "1y" })
  );
  // Everything else (favicon, images, etc.)
  app.use(express.static(distDir));
  // SPA fallback — any non-API GET returns index.html so client routing works.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}

export default app;
