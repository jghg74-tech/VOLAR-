const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");

const pool = new Pool({
  connectionString,
  ssl: connectionString && !isLocal ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','comercial')),
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tipos_tour (
      id SERIAL PRIMARY KEY,
      tour TEXT NOT NULL CHECK (tour IN ('barco','helicoptero')),
      nombre TEXT NOT NULL,
      UNIQUE (tour, nombre)
    );

    CREATE TABLE IF NOT EXISTS cupos (
      id SERIAL PRIMARY KEY,
      tour TEXT NOT NULL CHECK (tour IN ('barco','helicoptero')),
      fecha DATE NOT NULL,
      horario TEXT NOT NULL,
      capacidad INTEGER NOT NULL,
      ocupados INTEGER NOT NULL DEFAULT 0,
      UNIQUE (tour, fecha, horario)
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id SERIAL PRIMARY KEY,
      comercial_username TEXT NOT NULL,
      comercial_name TEXT NOT NULL,
      tour TEXT NOT NULL,
      cupo_id INTEGER REFERENCES cupos(id),
      fecha DATE NOT NULL,
      horario TEXT NOT NULL,
      precio NUMERIC NOT NULL,
      comision_pct NUMERIC NOT NULL,
      comision NUMERIC NOT NULL,
      forma_pago TEXT NOT NULL,
      tiene_comprobante BOOLEAN NOT NULL DEFAULT false,
      pago_sin_comprobante BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS pasajeros (
      id SERIAL PRIMARY KEY,
      venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL,
      documento TEXT NOT NULL,
      edad INTEGER NOT NULL,
      pais TEXT NOT NULL,
      tipo_tour TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comprobantes (
      venta_id INTEGER PRIMARY KEY REFERENCES ventas(id) ON DELETE CASCADE,
      data_url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  const { rows: adminRows } = await pool.query("SELECT id FROM users WHERE username = 'admin'");
  if (adminRows.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO users (username, password_hash, name, role) VALUES ($1,$2,$3,$4)",
      ["admin", hash, "Administrador", "admin"]
    );
    console.log("Usuario admin creado (admin / admin123) — cámbialo pronto.");
  }

  const { rows: tiposRows } = await pool.query("SELECT id FROM tipos_tour LIMIT 1");
  if (tiposRows.length === 0) {
    const seed = [
      ["barco", "Recorrido Mañana"],
      ["barco", "Atardecer en la Bahía"],
      ["barco", "Noche Música"],
      ["helicoptero", "Vuelo Panorámico Bahía"],
      ["helicoptero", "Sobrevuelo Ciudad Amurallada"],
      ["helicoptero", "Vuelo VIP Atardecer"],
    ];
    for (const [tour, nombre] of seed) {
      await pool.query("INSERT INTO tipos_tour (tour, nombre) VALUES ($1,$2)", [tour, nombre]);
    }
  }

  const { rows: cuposRows } = await pool.query("SELECT id FROM cupos LIMIT 1");
  if (cuposRows.length === 0) {
    const barcoHorarios = ["09:00", "11:00", "13:00", "15:00"];
    const heliHorarios = ["10:00", "12:00", "14:00", "16:00"];
    for (const offset of [0, 1]) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const fecha = d.toISOString().slice(0, 10);
      for (const h of barcoHorarios) {
        await pool.query(
          "INSERT INTO cupos (tour, fecha, horario, capacidad) VALUES ('barco',$1,$2,20)",
          [fecha, h]
        );
      }
      for (const h of heliHorarios) {
        await pool.query(
          "INSERT INTO cupos (tour, fecha, horario, capacidad) VALUES ('helicoptero',$1,$2,4)",
          [fecha, h]
        );
      }
    }
  }
}

module.exports = { pool, migrate };
