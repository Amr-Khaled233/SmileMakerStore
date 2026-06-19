import "dotenv/config";
import app from "./app.js";

// Fail fast on missing critical configuration instead of crashing later.
const REQUIRED = ["MONGODB_URI", "JWT_SECRET", "MANAGER_PASSWORD"];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Set them in your .env file before starting the server.");
  process.exit(1);
}

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`✅ API server → http://localhost:${PORT}`);
});
