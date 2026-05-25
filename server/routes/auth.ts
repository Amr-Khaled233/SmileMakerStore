import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== process.env.MANAGER_PASSWORD) {
    res.status(401).json({ error: "كلمة المرور غلط" });
    return;
  }
  const token = jwt.sign({ role: "manager" }, process.env.JWT_SECRET!, {
    expiresIn: "30d",
  });
  res.json({ token });
});

export default router;
