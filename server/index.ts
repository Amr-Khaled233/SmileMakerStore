import express from "express";
import cors from "cors";
import "dotenv/config";
import authRouter from "./routes/auth.js";
import ordersRouter from "./routes/orders.js";
import inventoryRouter from "./routes/inventory.js";
import pricingRouter from "./routes/pricing.js";
import settingsRouter from "./routes/settings.js";

const app = express();
const PORT = Number(process.env.API_PORT ?? 3001);

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
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
