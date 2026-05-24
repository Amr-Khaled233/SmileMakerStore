import express from "express";
import cors from "cors";
import "dotenv/config";
import authRouter from "./routes/auth.js";
import ordersRouter from "./routes/orders.js";
import inventoryRouter from "./routes/inventory.js";
import pricingRouter from "./routes/pricing.js";
import settingsRouter from "./routes/settings.js";

const app = express();
const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

// Support comma-separated list of allowed origins (e.g. for Vercel + local dev)
const ALLOWED = (process.env.FRONTEND_URL ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || ALLOWED.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/settings", settingsRouter);

app.listen(PORT, () => {
  console.log(`✅ API server → http://localhost:${PORT}`);
});
