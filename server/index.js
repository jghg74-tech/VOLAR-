require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { pool, migrate } = require("./db");
const { sign, requireAuth, requireAdmin } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));

const MAX_PASAJEROS = 10;

/* ---------------- AUTH ---------------- */

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Falta usuario o contraseña." });
  const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username.trim()]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  const token = sign(user);
  const comisionDefault = user.comision_default != null ? Number(user.comision_default) : null;
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role, comisionDefault } });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/* ---------------- TIPOS DE TOUR ---------------- */

app.get("/api/tipos-tour", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT tour, nombre FROM tipos_tour ORDER BY tour, id");
  const out = { barco: [], helicoptero: [] };
  rows.forEach((r) => out[r.tour].push(r.nombre));
  res.json(out);
});

app.post("/api/tipos-tour", requireAuth, requireAdmin, async (req, res) => {
  const { tour, nombre } = req.body || {};
  if (!["barco", "helicoptero"].includes(tour) || !nombre?.trim()) {
    return res.status(400).json({ error: "Datos inválidos." });
  }
  try {
    await pool.query("INSERT INTO tipos_tour (tour, nombre) VALUES ($1,$2)", [tour, nombre.trim()]);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ese tipo de tour ya existe." });
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

app.put("/api/tipos-tour", requireAuth, requireAdmin, async (req, res) => {
  const { tour, nombreAnterior, nombreNuevo } = req.body || {};
  if (!tour || !nombreAnterior || !nombreNuevo?.trim()) return res.status(400).json({ error: "Datos inválidos." });
  await pool.query("UPDATE tipos_tour SET nombre=$1 WHERE tour=$2 AND nombre=$3", [nombreNuevo.trim(), tour, nombreAnterior]);
  res.json({ ok: true });
});

app.delete("/api/tipos-tour", requireAuth, requireAdmin, async (req, res) => {
  const { tour, nombre } = req.body || {};
  if (!tour || !nombre) return res.status(400).json({ error: "Datos inválidos." });
  await pool.query("DELETE FROM tipos_tour WHERE tour=$1 AND nombre=$2", [tour, nombre]);
  res.json({ ok: true });
});

/* ---------------- CUPOS ---------------- */

app.get("/api/cupos", requireAuth, async (req, res) => {
  const { fecha, tour } = req.query;
  const clauses = [];
  const params = [];
  if (fecha) { params.push(fecha); clauses.push(`fecha = $${params.length}`); }
  if (tour) { params.push(tour); clauses.push(`tour = $${params.length}`); }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const { rows } = await pool.query(`SELECT * FROM cupos ${where} ORDER BY fecha, horario`, params);
  res.json(rows);
});

app.post("/api/cupos", requireAuth, requireAdmin, async (req, res) => {
  const { tour, fecha, horario, capacidad } = req.body || {};
  if (!["barco", "helicoptero"].includes(tour) || !fecha || !horario || !capacidad) {
    return res.status(400).json({ error: "Datos inválidos." });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO cupos (tour, fecha, horario, capacidad) VALUES ($1,$2,$3,$4) RETURNING *",
      [tour, fecha, horario, Number(capacidad)]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Ya existe un cupo con ese tour, fecha y horario." });
    res.status(500).json({ error: "No se pudo guardar." });
  }
});

app.delete("/api/cupos/:id", requireAuth, requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM cupos WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

/* ---------------- VENTAS ---------------- */

async function fetchVentas(whereSql, params) {
  const { rows: ventas } = await pool.query(
    `SELECT v.*, (c.venta_id IS NOT NULL) AS comprobante_guardado FROM ventas v LEFT JOIN comprobantes c ON c.venta_id = v.id ${whereSql} ORDER BY v.created_at DESC LIMIT 200`,
    params
  );
  const ids = ventas.map((v) => v.id);
  let pasajerosPorVenta = {};
  if (ids.length) {
    const { rows: pasajeros } = await pool.query(
      "SELECT * FROM pasajeros WHERE venta_id = ANY($1::int[])",
      [ids]
    );
    pasajeros.forEach((p) => {
      (pasajerosPorVenta[p.venta_id] = pasajerosPorVenta[p.venta_id] || []).push({
        nombre: p.nombre, documento: p.documento, edad: p.edad, pais: p.pais, tipoTour: p.tipo_tour,
      });
    });
  }
  return ventas.map((v) => ({
    id: v.id,
    comercial: v.comercial_username,
    comercialName: v.comercial_name,
    tour: v.tour,
    fecha: v.fecha.toISOString().slice(0, 10),
    horario: v.horario,
    precio: Number(v.precio),
    comisionPct: Number(v.comision_pct),
    comision: Number(v.comision),
    formaPago: v.forma_pago,
    tieneComprobante: v.tiene_comprobante,
    pagoSinComprobante: v.pago_sin_comprobante,
    timestamp: new Date(v.created_at).getTime(),
    pasajeros: pasajerosPorVenta[v.id] || [],
  }));
}

app.get("/api/ventas", requireAuth, requireAdmin, async (req, res) => {
  res.json(await fetchVentas("", []));
});

// Un comercial SOLO puede ver sus propias ventas — nunca las de otros comerciales.
// Esa información completa (todos los comerciales) queda exclusiva del admin, arriba.
app.get("/api/mis-ventas", requireAuth, async (req, res) => {
  res.json(await fetchVentas("WHERE v.comercial_username = $1", [req.user.username]));
});

app.get("/api/mi-perfil", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, username, name, nombre, apellido, cedula, telefono, email, direccion,
            fecha_nacimiento, fecha_ingreso, comision_default,
            (SELECT 1 FROM fotos_comercial f WHERE f.user_id = users.id) IS NOT NULL AS tiene_foto
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  const u = rows[0];
  if (!u) return res.status(404).json({ error: "No encontrado." });
  res.json({
    id: u.id, username: u.username, name: u.name, nombre: u.nombre, apellido: u.apellido,
    cedula: u.cedula, telefono: u.telefono, email: u.email, direccion: u.direccion,
    fechaNacimiento: u.fecha_nacimiento ? u.fecha_nacimiento.toISOString().slice(0, 10) : null,
    fechaIngreso: u.fecha_ingreso ? u.fecha_ingreso.toISOString().slice(0, 10) : null,
    comisionDefault: u.comision_default != null ? Number(u.comision_default) : null,
    tieneFoto: u.tiene_foto,
  });
});

// Un comercial solo puede ver SU PROPIA foto (verificamos que el id pedido sea el suyo, salvo que sea admin).
app.get("/api/mi-foto", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT data_url FROM fotos_comercial WHERE user_id=$1", [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: "No hay foto guardada." });
  res.json({ dataUrl: rows[0].data_url });
});

app.post("/api/ventas", requireAuth, async (req, res) => {
  const {
    tour, cupoId, pasajeros, precio, comisionPct, formaPago, comprobanteDataUrl, sinComprobante,
  } = req.body || {};

  if (!["barco", "helicoptero"].includes(tour)) return res.status(400).json({ error: "Tour inválido." });
  if (!Array.isArray(pasajeros) || pasajeros.length === 0 || pasajeros.length > MAX_PASAJEROS) {
    return res.status(400).json({ error: `Debes registrar entre 1 y ${MAX_PASAJEROS} pasajeros.` });
  }
  for (const p of pasajeros) {
    if (!p.nombre?.trim() || !p.documento?.trim() || !p.edad || !p.pais?.trim() || !p.tipoTour) {
      return res.status(400).json({ error: "Completa todos los datos de cada pasajero." });
    }
  }
  if (!precio || Number(precio) <= 0) return res.status(400).json({ error: "Precio inválido." });
  if (!formaPago) return res.status(400).json({ error: "Selecciona la forma de pago." });
  if (!comprobanteDataUrl && !sinComprobante) {
    return res.status(400).json({ error: "Falta el comprobante o marcar pago sin comprobante." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: cupoRows } = await client.query("SELECT * FROM cupos WHERE id=$1 FOR UPDATE", [cupoId]);
    const cupo = cupoRows[0];
    if (!cupo) throw { status: 404, message: "El cupo no existe." };
    const nPas = pasajeros.length;
    if (cupo.ocupados + nPas > cupo.capacidad) throw { status: 409, message: "Ese horario ya no tiene cupo suficiente." };

    await client.query("UPDATE cupos SET ocupados = ocupados + $1 WHERE id=$2", [nPas, cupoId]);

    const comisionVal = (Number(precio) * (Number(comisionPct) || 0)) / 100;
    const { rows: ventaRows } = await client.query(
      `INSERT INTO ventas (comercial_username, comercial_name, tour, cupo_id, fecha, horario, precio, comision_pct, comision, forma_pago, tiene_comprobante, pago_sin_comprobante)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        req.user.username, req.user.name, tour, cupoId, cupo.fecha, cupo.horario,
        Number(precio), Number(comisionPct) || 0, comisionVal, formaPago,
        !!comprobanteDataUrl, !comprobanteDataUrl && !!sinComprobante,
      ]
    );
    const ventaId = ventaRows[0].id;

    for (const p of pasajeros) {
      await client.query(
        "INSERT INTO pasajeros (venta_id, nombre, documento, edad, pais, tipo_tour) VALUES ($1,$2,$3,$4,$5,$6)",
        [ventaId, p.nombre.trim(), p.documento.trim(), Number(p.edad), p.pais.trim(), p.tipoTour]
      );
    }

    if (comprobanteDataUrl) {
      await client.query("INSERT INTO comprobantes (venta_id, data_url) VALUES ($1,$2)", [ventaId, comprobanteDataUrl]);
    }

    await client.query("COMMIT");
    res.status(201).json({ ok: true, ventaId });
  } catch (e) {
    await client.query("ROLLBACK");
    const status = e.status || 500;
    res.status(status).json({ error: e.message || "No se pudo registrar la venta." });
  } finally {
    client.release();
  }
});

app.get("/api/comprobante/:ventaId", requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query("SELECT data_url FROM comprobantes WHERE venta_id=$1", [req.params.ventaId]);
  if (!rows[0]) return res.status(404).json({ error: "No hay comprobante para esta venta." });
  res.json({ dataUrl: rows[0].data_url });
});

/* ---------------- USUARIOS (COMERCIALES) ---------------- */

app.get("/api/usuarios", requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.name, u.nombre, u.apellido, u.cedula, u.telefono, u.email,
           u.direccion, u.fecha_nacimiento, u.fecha_ingreso, u.comision_default,
           (f.user_id IS NOT NULL) AS tiene_foto
    FROM users u
    LEFT JOIN fotos_comercial f ON f.user_id = u.id
    WHERE u.role='comercial'
    ORDER BY u.name
  `);
  res.json(
    rows.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      nombre: u.nombre,
      apellido: u.apellido,
      cedula: u.cedula,
      telefono: u.telefono,
      email: u.email,
      direccion: u.direccion,
      fechaNacimiento: u.fecha_nacimiento ? u.fecha_nacimiento.toISOString().slice(0, 10) : null,
      fechaIngreso: u.fecha_ingreso ? u.fecha_ingreso.toISOString().slice(0, 10) : null,
      comisionDefault: u.comision_default != null ? Number(u.comision_default) : null,
      tieneFoto: u.tiene_foto,
    }))
  );
});

app.post("/api/usuarios", requireAuth, requireAdmin, async (req, res) => {
  const {
    nombre, apellido, cedula, telefono, email, direccion,
    fechaNacimiento, fechaIngreso, comisionDefault,
    username, password, fotoDataUrl,
  } = req.body || {};

  if (!nombre?.trim() || !apellido?.trim() || !cedula?.trim() || !telefono?.trim() || !email?.trim() ||
      !direccion?.trim() || !fechaNacimiento || !fechaIngreso || comisionDefault === undefined || comisionDefault === "" ||
      !username?.trim() || !password?.trim()) {
    return res.status(400).json({ error: "Completa todos los campos." });
  }
  if (!fotoDataUrl) {
    return res.status(400).json({ error: "La foto del comercial es obligatoria." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const hash = await bcrypt.hash(password, 10);
    const fullName = `${nombre.trim()} ${apellido.trim()}`.trim();
    const { rows } = await client.query(
      `INSERT INTO users
        (username, password_hash, name, nombre, apellido, cedula, telefono, email, direccion, fecha_nacimiento, fecha_ingreso, comision_default, role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'comercial')
       RETURNING id, username, name`,
      [username.trim(), hash, fullName, nombre.trim(), apellido.trim(), cedula.trim(), telefono.trim(), email.trim(),
       direccion.trim(), fechaNacimiento, fechaIngreso, Number(comisionDefault)]
    );
    const newUser = rows[0];
    if (fotoDataUrl) {
      await client.query("INSERT INTO fotos_comercial (user_id, data_url) VALUES ($1,$2)", [newUser.id, fotoDataUrl]);
    }
    await client.query("COMMIT");
    res.status(201).json(newUser);
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505") return res.status(409).json({ error: "Ese usuario o cédula ya existe." });
    res.status(500).json({ error: "No se pudo crear el acceso." });
  } finally {
    client.release();
  }
});

app.get("/api/usuarios/:id/foto", requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query("SELECT data_url FROM fotos_comercial WHERE user_id=$1", [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "No hay foto para este comercial." });
  res.json({ dataUrl: rows[0].data_url });
});

app.delete("/api/usuarios/:id", requireAuth, requireAdmin, async (req, res) => {
  await pool.query("DELETE FROM users WHERE id=$1 AND role='comercial'", [req.params.id]);
  res.json({ ok: true });
});

/* ---------------- FRONTEND ESTÁTICO ---------------- */

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 10000;
migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`Volar server escuchando en el puerto ${PORT}`));
  })
  .catch((e) => {
    console.error("Error al migrar la base de datos:", e);
    process.exit(1);
  });
