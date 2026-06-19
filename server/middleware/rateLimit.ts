import rateLimit from "express-rate-limit";

// Sensible defaults shared by all limiters.
const base = {
  standardHeaders: true,
  legacyHeaders: false,
};

// Broad safety net for the whole API — stops a single IP from hammering it.
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // 120 requests/min per IP
  message: { error: "طلبات كتير جداً، استنى شوية وحاول تاني." },
});

// Tight limit on public order creation — the main abuse vector (a bot could
// otherwise create unlimited orders and drain inventory / bloat the DB).
export const orderLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 8, // max 8 orders per IP per 10 min
  message: { error: "عملت أوردرات كتير في وقت قصير، حاول تاني بعد شوية." },
});

// Slow down password guessing on the dashboard login.
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per IP per 15 min
  message: { error: "محاولات دخول كتير، حاول تاني بعد ربع ساعة." },
});
