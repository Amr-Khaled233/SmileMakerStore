import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import ordersRouter from "./routes/orders.js";
import inventoryRouter from "./routes/inventory.js";
import pricingRouter from "./routes/pricing.js";
import settingsRouter from "./routes/settings.js";
import productsRouter from "./routes/products.js";
import bundlesRouter from "./routes/bundles.js";
import reviewsRouter from "./routes/reviews.js";

const ALLOWED = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();

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

app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/products", productsRouter);
app.use("/api/bundles", bundlesRouter);
app.use("/api/reviews", reviewsRouter);

export default app;
