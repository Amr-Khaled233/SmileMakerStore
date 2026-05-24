import "dotenv/config";
import app from "./app.js";

const PORT = Number(process.env.API_PORT ?? process.env.PORT ?? 3001);

app.listen(PORT, () => {
  console.log(`✅ API server → http://localhost:${PORT}`);
});
