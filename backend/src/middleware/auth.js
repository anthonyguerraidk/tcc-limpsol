import { timingSafeEqual } from "node:crypto";
export function requireKey(variable) {
  return (req, res, next) => {
    const expected = process.env[variable];
    if (!expected && process.env.NODE_ENV !== "production") return next();
    const supplied = req.get("Authorization")?.replace(/^Bearer /, "") || "";
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected || "");
    if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "Chave de acesso inválida" });
    }
    next();
  };
}
