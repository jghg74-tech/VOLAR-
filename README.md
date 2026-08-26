# Volar — Manifiesto de ventas

App de ventas para el equipo comercial de Volar (barco + helicóptero, Cartagena).
Backend en Node/Express + PostgreSQL, frontend en React (Vite).

## Estructura

```
server/   API (Express + PostgreSQL + JWT)
client/   Frontend (React + Vite)
```

## Subir este proyecto a GitHub

```bash
cd volar-app
git init
git add .
git commit -m "Primera versión de la app Volar"
```

Luego crea un repositorio vacío en https://github.com/new (por ejemplo `volar-ventas`,
público) y conéctalo:

```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/volar-ventas.git
git push -u origin main
```

Avísame cuando esté subido (y pásame la URL del repo) para crear la base de datos y
el servicio web en Render.

## Desarrollo local (opcional)

Necesitas una base de datos Postgres local o remota.

```bash
cd server && npm install && cp .env.example .env  # edita DATABASE_URL
npm start        # http://localhost:10000

cd ../client && npm install
npm run dev       # http://localhost:5173 (proxy a la API en :10000)
```

## Producción (Render)

- Un solo **Web Service** (Node) construye el frontend y sirve todo desde `server/index.js`.
- **Build command:** `npm install --prefix server && npm install --prefix client && npm run build --prefix client`
- **Start command:** `npm run start --prefix server`
- Variables de entorno necesarias: `DATABASE_URL` (de tu Postgres de Render) y `JWT_SECRET` (una cadena aleatoria larga).
- La base de datos se crea sola (tablas + usuario admin `admin`/`admin123` + datos de ejemplo) la primera vez que arranca el servidor.

**Cambia la contraseña del admin apenas entres por primera vez** (créate un usuario nuevo desde
"Comerciales" o pide que se agregue un endpoint de cambio de contraseña).
