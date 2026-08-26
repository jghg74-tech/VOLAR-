const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    SECRET,
    { expiresIn: "30d" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No autenticado." });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Sesión inválida o expirada." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Solo el administrador puede hacer esto." });
  next();
}

module.exports = { sign, requireAuth, requireAdmin, SECRET };
