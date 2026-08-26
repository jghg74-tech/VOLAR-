import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Ship, Plane, LogOut, Plus, Trash2, ShieldCheck, AlertCircle, RefreshCw,
  UserPlus, Anchor, Camera, X, ChevronDown, ChevronUp, Image as ImageIcon, Loader2,
} from "lucide-react";
import { api, getToken, setToken } from "./api";

/* ---------------------------------------------------------------
   TOKENS — paleta real de Volar (barco negro + helipuerto, atardecer
   en la bahía de Cartagena, chalecos/rieles naranjas, logo manuscrito)
------------------------------------------------------------------*/
const FONT_ID = "tc-fonts";
function ensureFonts() {
  if (document.getElementById(FONT_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Caveat:wght@600;700&display=swap";
  document.head.appendChild(link);
  const style = document.createElement("style");
  style.textContent = "@keyframes tc-spin{to{transform:rotate(360deg)}} .tc-spin{animation:tc-spin 0.8s linear infinite;display:inline-block}";
  document.head.appendChild(style);
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtCOP = (n) => "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
const fmtDateLabel = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" });
};

const TOUR_META = {
  barco: { label: "Barco Volar", Icon: Ship, color: "#F4A93B" },
  helicoptero: { label: "Helicóptero", Icon: Plane, color: "#E8642B" },
};
const MAX_PASAJEROS = 10;
const FORMAS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Mixto"];

function emptyPasajero() {
  return { _id: Math.random().toString(36).slice(2), nombre: "", documento: "", edad: "", pais: "Colombia", tipoTour: "" };
}

function compressImage(file, maxDim = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------
   UI atoms
------------------------------------------------------------------*/
function Stamp({ children, color }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color, border: `1.5px solid ${color}`, borderRadius: 999, padding: "3px 10px" }}>
      {children}
    </span>
  );
}
function TicketDivider({ color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", margin: "12px 0" }}>
      <div style={{ flex: 1, borderTop: `2px dashed ${color}55` }} />
      <Anchor size={14} color={color + "88"} style={{ margin: "0 8px" }} />
      <div style={{ flex: 1, borderTop: `2px dashed ${color}55` }} />
    </div>
  );
}
function EmptyState({ text }) {
  return <div style={{ border: "2px dashed #14110D33", borderRadius: 4, padding: "26px 20px", textAlign: "center", color: "#12242A88", fontSize: 13.5 }}>{text}</div>;
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#12242A99", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", boxSizing: "border-box", marginTop: 6, padding: "10px 12px", borderRadius: 3, border: "1.5px solid #14110D33", background: "#fff", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#1A140F", outline: "none" };
const primaryBtn = { width: "100%", marginTop: 22, padding: "12px 0", borderRadius: 3, border: "none", background: "#E8642B", color: "#fff", fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" };
const miniLabel = { fontSize: 11, color: "#12242A88", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 4 };

/* ---------------------------------------------------------------
   LOGIN
------------------------------------------------------------------*/
function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(username.trim(), password);
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        fontFamily: "'Inter', sans-serif",
        background: "#14110D",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Foto de fondo: el barco Volar */}
      <img
        src="/images.jpg"
        alt="Barco Volar"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 30%",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(20,17,13,0.15) 0%, rgba(20,17,13,0.35) 45%, rgba(20,17,13,0.88) 72%, #14110D 92%)",
        }}
      />

      {/* Logo arriba, sobre la foto */}
      <div style={{ position: "relative", padding: "max(24px, env(safe-area-inset-top)) 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Ship size={18} color="#F4A93B" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }} />
          </div>
          <h1 style={{ fontFamily: "'Caveat', cursive", color: "#fff", fontSize: 48, lineHeight: 1, margin: "4px 0 0", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
            Volar
          </h1>
        </div>

        {/* Insignia circular: helicóptero sobrevolando la bahía */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2.5px solid #F4A93B",
            boxShadow: "0 6px 18px rgba(0,0,0,0.45)",
            flexShrink: 0,
          }}
        >
          <img
            src="/helicoptero.webp"
            alt="Sobrevuelo en helicóptero"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>

      {/* Tarjeta de acceso, compacta y flotante abajo */}
      <div style={{ position: "relative", display: "flex", justifyContent: "center", padding: "0 16px max(16px, env(safe-area-inset-bottom))" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 300,
            background: "#F6EEDD",
            borderRadius: 14,
            boxShadow: "0 -6px 30px rgba(0,0,0,0.35)",
            padding: "16px 18px",
          }}
        >
          <p style={{ margin: "0 0 2px", fontFamily: "'Oswald', sans-serif", fontSize: 15.5, color: "#14110D", textTransform: "uppercase", letterSpacing: 0.5 }}>
            ¡Hola! 👋
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 11.5, color: "#12242A88" }}>
            Ingresa para registrar tus ventas
          </p>

          <form onSubmit={submit}>
            <label style={{ ...miniLabel, fontSize: 10 }}>Usuario</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="tu.usuario" style={{ ...inputStyle, padding: "7px 10px", fontSize: 13, marginTop: 3 }} />
            <label style={{ ...miniLabel, fontSize: 10, marginTop: 8 }}>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inputStyle, padding: "7px 10px", fontSize: 13, marginTop: 3 }} />
            {error && (
              <div style={{ display: "flex", gap: 5, alignItems: "center", color: "#c0392b", fontSize: 11.5, marginTop: 7 }}>
                <AlertCircle size={12} /> {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ ...primaryBtn, padding: "9px 0", fontSize: 12.5, marginTop: 12, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Ingresando..." : "Zarpar / Despegar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   TOPBAR
------------------------------------------------------------------*/
function Topbar({ user, onLogout, tabs, tab, setTab }) {
  return (
    <div style={{ background: "#14110D", color: "#F6EEDD", padding: "0 20px", borderBottom: "3px solid #E8642B" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: 30, color: "#F6EEDD", lineHeight: 1 }}>Volar</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#F4A93B", textTransform: "uppercase", letterSpacing: 1.2, borderLeft: "1px solid #F4A93B55", paddingLeft: 8 }}>Manifiesto</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: "#F4A93B" }}>
            {user.name} {user.role === "admin" ? "· admin" : "· comercial"}
          </span>
          <button onClick={onLogout} style={{ background: "none", border: "1px solid #F6EEDD55", color: "#F6EEDD", borderRadius: 3, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontSize: 12.5 }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </div>
      {tabs && (
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 4 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: "none", border: "none", borderBottom: tab === t.key ? "3px solid #E8642B" : "3px solid transparent", color: tab === t.key ? "#F6EEDD" : "#F6EEDD99", padding: "10px 14px", fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   COMERCIAL: registrar venta
------------------------------------------------------------------*/
function VentaForm({ user, tiposTour }) {
  const [fecha, setFecha] = useState(todayStr());
  const [tour, setTour] = useState("barco");
  const [cupos, setCupos] = useState([]);
  const [cupoId, setCupoId] = useState("");
  const [pasajeros, setPasajeros] = useState([emptyPasajero()]);
  const [precio, setPrecio] = useState("");
  const [comisionPct, setComisionPct] = useState(user.comisionDefault ?? 10);
  const [formaPago, setFormaPago] = useState("");
  const [comprobante, setComprobante] = useState(null);
  const [sinComprobante, setSinComprobante] = useState(false);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCupos = useCallback(async () => {
    try {
      const data = await api.cupos({ tour, fecha });
      setCupos(data);
    } catch (e) { /* silencioso, se reintenta */ }
  }, [tour, fecha]);

  useEffect(() => { loadCupos(); }, [loadCupos]);

  useEffect(() => {
    setPasajeros((prev) => prev.map((p) => ({ ...p, tipoTour: (tiposTour[tour] || [])[0] || "" })));
    setCupoId("");
  }, [tour]);

  const nPas = pasajeros.length;
  const cupoSel = cupos.find((c) => c.id === Number(cupoId));
  const disponibles = cupoSel ? cupoSel.capacidad - cupoSel.ocupados : null;
  const comisionVal = ((Number(precio) || 0) * (Number(comisionPct) || 0)) / 100;

  const updatePasajero = (id, field, value) => setPasajeros((prev) => prev.map((p) => (p._id === id ? { ...p, [field]: value } : p)));
  const addPasajero = () => { if (pasajeros.length < MAX_PASAJEROS) setPasajeros((prev) => [...prev, { ...emptyPasajero(), tipoTour: (tiposTour[tour] || [])[0] || "" }]); };
  const removePasajero = (id) => setPasajeros((prev) => (prev.length > 1 ? prev.filter((p) => p._id !== id) : prev));

  const onFotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setMsg(null);
    setComprimiendo(true);
    try {
      setComprobante(await compressImage(file));
    } catch (err) {
      setMsg({ type: "error", text: "No se pudo procesar la foto, intenta de nuevo." });
    }
    setComprimiendo(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!cupoSel) return setMsg({ type: "error", text: "Selecciona un horario disponible." });
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!p.nombre.trim() || !p.documento.trim() || !p.edad || !p.pais.trim() || !p.tipoTour) {
        return setMsg({ type: "error", text: `Completa todos los datos del pasajero ${i + 1}.` });
      }
    }
    if (!precio || Number(precio) <= 0) return setMsg({ type: "error", text: "Ingresa un precio total válido." });
    if (!formaPago) return setMsg({ type: "error", text: "Selecciona la forma de pago." });
    if (!comprobante && !sinComprobante) return setMsg({ type: "error", text: "Sube la foto del comprobante o marca pago sin comprobante." });

    setSaving(true);
    try {
      await api.addVenta({
        tour,
        cupoId: cupoSel.id,
        pasajeros: pasajeros.map(({ _id, ...rest }) => rest),
        precio: Number(precio),
        comisionPct: Number(comisionPct),
        formaPago,
        comprobanteDataUrl: comprobante,
        sinComprobante,
      });
      setMsg({ type: "ok", text: "¡Venta registrada!" });
      setPasajeros([{ ...emptyPasajero(), tipoTour: (tiposTour[tour] || [])[0] || "" }]);
      setPrecio(""); setCupoId(""); setFormaPago(""); setComprobante(null); setSinComprobante(false);
      loadCupos();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    }
    setSaving(false);
  };

  const meta = TOUR_META[tour];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ background: "#fff", border: "1px solid #14110D1a", borderRadius: 4, overflow: "hidden", boxShadow: "0 12px 30px -18px rgba(20,17,13,0.4)" }}>
        <div style={{ background: meta.color, padding: "16px 22px", display: "flex", alignItems: "center", gap: 10 }}>
          <meta.Icon size={20} color="#fff" />
          <span style={{ fontFamily: "'Oswald', sans-serif", color: "#fff", fontSize: 19, letterSpacing: 0.5, textTransform: "uppercase" }}>Registrar venta — {meta.label}</span>
        </div>
        <form onSubmit={submit} style={{ padding: "22px 22px 26px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {Object.entries(TOUR_META).map(([key, m]) => (
              <button type="button" key={key} onClick={() => setTour(key)} style={{ flex: 1, padding: "9px 0", borderRadius: 3, border: `1.5px solid ${m.color}`, background: tour === key ? m.color : "#fff", color: tour === key ? "#fff" : m.color, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Inter', sans-serif" }}>
                <m.Icon size={14} /> {m.label}
              </button>
            ))}
          </div>

          <Field label="Fecha del tour">
            <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setCupoId(""); }} style={inputStyle} />
          </Field>

          <Field label="Horario / cupo disponible">
            {cupos.length === 0 ? (
              <div style={{ fontSize: 13, color: "#c0392b" }}>No hay cupos programados para esta fecha. Pide al admin que los programe.</div>
            ) : (
              <select value={cupoId} onChange={(e) => setCupoId(e.target.value)} style={inputStyle}>
                <option value="">Selecciona un horario</option>
                {cupos.map((c) => {
                  const libres = c.capacidad - c.ocupados;
                  return <option key={c.id} value={c.id} disabled={libres <= 0}>{c.horario} — {libres > 0 ? `${libres} cupos libres` : "AGOTADO"}</option>;
                })}
              </select>
            )}
          </Field>

          <TicketDivider color={meta.color} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#12242A99", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Pasajeros ({nPas}/{MAX_PASAJEROS})</span>
            {cupoSel && <span style={{ fontSize: 11.5, color: "#12242A88" }}>{disponibles} cupos libres en ese horario</span>}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
            {pasajeros.map((p, i) => (
              <div key={p._id} style={{ border: `1px solid ${meta.color}55`, borderRadius: 3, padding: "10px 12px", background: "#F6EEDD44" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: meta.color }}>PASAJERO {i + 1}</span>
                  {pasajeros.length > 1 && <button type="button" onClick={() => removePasajero(p._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b88" }}><X size={15} /></button>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input value={p.nombre} onChange={(e) => updatePasajero(p._id, "nombre", e.target.value)} placeholder="Nombre completo" style={{ ...inputStyle, marginTop: 0 }} />
                  <input value={p.documento} onChange={(e) => updatePasajero(p._id, "documento", e.target.value)} placeholder="Cédula o pasaporte" style={{ ...inputStyle, marginTop: 0 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: 8 }}>
                  <input type="number" min="0" value={p.edad} onChange={(e) => updatePasajero(p._id, "edad", e.target.value)} placeholder="Edad" style={{ ...inputStyle, marginTop: 0 }} />
                  <input value={p.pais} onChange={(e) => updatePasajero(p._id, "pais", e.target.value)} placeholder="País" style={{ ...inputStyle, marginTop: 0 }} />
                  <select value={p.tipoTour} onChange={(e) => updatePasajero(p._id, "tipoTour", e.target.value)} style={{ ...inputStyle, marginTop: 0 }}>
                    <option value="">Tour...</option>
                    {(tiposTour[tour] || []).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addPasajero} disabled={pasajeros.length >= MAX_PASAJEROS} style={{ width: "100%", padding: "9px 0", borderRadius: 3, border: `1.5px dashed ${meta.color}88`, background: "none", color: meta.color, fontWeight: 700, fontSize: 12.5, cursor: pasajeros.length >= MAX_PASAJEROS ? "not-allowed" : "pointer", opacity: pasajeros.length >= MAX_PASAJEROS ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 18, fontFamily: "'Inter', sans-serif" }}>
            <Plus size={14} /> Agregar pasajero {pasajeros.length >= MAX_PASAJEROS ? "(máx. 10)" : ""}
          </button>

          <TicketDivider color={meta.color} />

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Field label="Precio total (COP)">
                <input type="number" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0" style={inputStyle} />
              </Field>
            </div>
            <div style={{ width: 100 }}>
              <Field label="Comisión %">
                <input type="number" min="0" max="100" value={comisionPct} onChange={(e) => setComisionPct(e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </div>

          <Field label="Forma de pago">
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} style={inputStyle}>
              <option value="">Selecciona...</option>
              {FORMAS_PAGO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>

          <Field label="Comprobante de pago (foto)">
            {comprobante ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <img src={comprobante} alt="Comprobante" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 3, border: `1px solid ${meta.color}` }} />
                <button type="button" onClick={() => setComprobante(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #c0392b55", color: "#c0392b", borderRadius: 3, padding: "6px 10px", cursor: "pointer", fontSize: 12.5 }}>
                  <X size={13} /> Quitar foto
                </button>
              </div>
            ) : (
              <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1.5px dashed ${meta.color}88`, borderRadius: 3, padding: "14px 0", color: meta.color, fontWeight: 700, fontSize: 13, cursor: sinComprobante ? "not-allowed" : "pointer", opacity: sinComprobante ? 0.4 : 1 }}>
                {comprimiendo ? <Loader2 size={16} className="tc-spin" /> : <Camera size={16} />}
                {comprimiendo ? "Procesando foto..." : "Tomar o subir foto del comprobante"}
                <input type="file" accept="image/*" capture="environment" onChange={onFotoChange} disabled={sinComprobante} style={{ display: "none" }} />
              </label>
            )}
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: "#12242A99" }}>
              <input type="checkbox" checked={sinComprobante} onChange={(e) => { setSinComprobante(e.target.checked); if (e.target.checked) setComprobante(null); }} />
              Pago en efectivo en el muelle (sin comprobante)
            </label>
          </Field>

          <TicketDivider color={meta.color} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#12242A" }}>
            <span>Tu comisión estimada</span>
            <strong style={{ color: meta.color }}>{fmtCOP(comisionVal)}</strong>
          </div>

          {msg && (
            <div style={{ marginTop: 14, padding: "9px 12px", borderRadius: 3, fontSize: 13, background: msg.type === "ok" ? "#F4A93B1a" : "#c0392b1a", color: msg.type === "ok" ? "#14110D" : "#c0392b", display: "flex", gap: 6, alignItems: "center" }}>
              {msg.type === "ok" ? <ShieldCheck size={14} /> : <AlertCircle size={14} />} {msg.text}
            </div>
          )}

          <button type="submit" disabled={saving || comprimiendo} style={{ ...primaryBtn, background: meta.color, marginTop: 18, opacity: saving || comprimiendo ? 0.7 : 1 }}>
            {saving ? "Guardando..." : "Confirmar venta"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN: comprobante modal
------------------------------------------------------------------*/
function ComprobanteModal({ ventaId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.comprobante(ventaId));
      } catch (e) { setError(true); }
      setLoading(false);
    })();
  }, [ventaId]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#14110Dcc", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, padding: 14, maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 14, color: "#14110D" }}>Comprobante de pago</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#12242A88" }}>Cargando...</div>}
        {!loading && error && <div style={{ padding: 30, textAlign: "center", color: "#c0392b" }}>No se encontró la imagen.</div>}
        {!loading && data && <img src={data.dataUrl} alt="Comprobante" style={{ width: "100%", borderRadius: 3 }} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN: resumen en tiempo real
------------------------------------------------------------------*/
/* ---------------------------------------------------------------
   COMERCIAL: mis ventas (solo lo propio, nunca lo de otros)
------------------------------------------------------------------*/
function MisVentas({ user }) {
  const [ventas, setVentas] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [viendoFoto, setViendoFoto] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [v, p] = await Promise.all([api.misVentas(), api.miPerfil()]);
      setVentas(v); setPerfil(p);
    } catch (e) { /* silencioso */ }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 5000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const hoy = todayStr();
  const ventasHoy = ventas.filter((v) => v.fecha === hoy);
  const comisionHoy = ventasHoy.reduce((s, v) => s + v.comision, 0);
  const comisionTotal = ventas.reduce((s, v) => s + v.comision, 0);

  const stats = [
    { label: "Ventas hoy", value: ventasHoy.length, color: "#14110D" },
    { label: "Comisión hoy", value: fmtCOP(comisionHoy), color: "#E8642B" },
    { label: "Comisión acumulada", value: fmtCOP(comisionTotal), color: "#F4A93B" },
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 60px" }}>
      {perfil && (
        <div style={{ background: "#fff", border: "1px solid #14110D1a", borderRadius: 4, padding: 16, marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => perfil.tieneFoto && setViendoFoto(true)}
            style={{ width: 52, height: 52, borderRadius: "50%", background: "#F6EEDD", border: "2px solid #F4A93B", display: "flex", alignItems: "center", justifyContent: "center", cursor: perfil.tieneFoto ? "pointer" : "default", padding: 0, overflow: "hidden", flexShrink: 0 }}
          >
            {perfil.tieneFoto ? <ImageIcon size={20} color="#F4A93B" /> : <Ship size={18} color="#F4A93B88" />}
          </button>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: "#14110D" }}>{perfil.name}</div>
            <div style={{ fontSize: 12, color: "#12242A88" }}>
              {perfil.telefono} {perfil.email ? `· ${perfil.email}` : ""}
            </div>
            {perfil.comisionDefault != null && (
              <Stamp color="#E8642B">{perfil.comisionDefault}% comisión por defecto</Stamp>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 20 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${s.color}33`, borderRadius: 4, padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#12242A88", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: "'Oswald', sans-serif", color: "#14110D", textTransform: "uppercase", letterSpacing: 0.5, fontSize: 15, marginBottom: 10 }}>Mis ventas</h3>
      {ventas.length === 0 ? (
        <EmptyState text="Todavía no has registrado ninguna venta." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ventas.map((v) => {
            const meta = TOUR_META[v.tour];
            const expanded = expandedId === v.id;
            const tiposResumen = Object.entries(v.pasajeros.reduce((acc, p) => { acc[p.tipoTour] = (acc[p.tipoTour] || 0) + 1; return acc; }, {})).map(([t, n]) => `${n}× ${t}`).join(" · ");
            return (
              <div key={v.id} style={{ background: "#fff", border: "1px solid #14110D1a", borderLeft: `4px solid ${meta.color}`, borderRadius: 3, padding: "10px 14px" }}>
                <div onClick={() => setExpandedId(expanded ? null : v.id)} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: "pointer" }}>
                  <meta.Icon size={16} color={meta.color} />
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tiposResumen}</div>
                    <div style={{ fontSize: 11.5, color: "#12242A88" }}>{fmtDateLabel(v.fecha)} {v.horario}</div>
                  </div>
                  <Stamp color={meta.color}>{v.pasajeros.length} pax</Stamp>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginLeft: "auto" }}>{fmtCOP(v.precio)}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#E8642B" }}>com. {fmtCOP(v.comision)}</div>
                  {expanded ? <ChevronUp size={16} color="#12242A88" /> : <ChevronDown size={16} color="#12242A88" />}
                </div>
                {expanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #14110D22" }}>
                    {v.pasajeros.map((p, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12.5, background: "#F6EEDD55", borderRadius: 3, padding: "6px 10px", marginBottom: 6 }}>
                        <strong>{p.nombre}</strong>
                        <span style={{ color: "#12242A88" }}>{p.documento}</span>
                        <span style={{ color: meta.color, fontWeight: 600 }}>{p.tipoTour}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {viendoFoto && (
        <FotoPropiaModal onClose={() => setViendoFoto(false)} />
      )}
    </div>
  );
}

function FotoPropiaModal({ onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await api.miFoto()); }
      catch (e) { setError(true); }
      setLoading(false);
    })();
  }, []);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#14110Dcc", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, padding: 14, maxWidth: 320, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 14, color: "#14110D" }}>Mi foto</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#12242A88" }}>Cargando...</div>}
        {!loading && error && <div style={{ padding: 30, textAlign: "center", color: "#c0392b" }}>No hay foto guardada.</div>}
        {!loading && data && <img src={data.dataUrl} alt="Mi foto" style={{ width: "100%", borderRadius: 3 }} />}
      </div>
    </div>
  );
}

function Resumen() {
  const [ventas, setVentas] = useState([]);
  const [cupos, setCupos] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [viewingComprobante, setViewingComprobante] = useState(null);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([api.ventas(), api.cupos()]);
      setVentas(v); setCupos(c);
    } catch (e) { /* silencioso */ }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 4000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const hoy = todayStr();
  const ventasHoy = ventas.filter((v) => v.fecha === hoy);
  const ingresosHoy = ventasHoy.reduce((s, v) => s + v.precio, 0);
  const comisionesHoy = ventasHoy.reduce((s, v) => s + v.comision, 0);
  const cuposHoy = cupos.filter((c) => c.fecha === hoy);
  const librBarco = cuposHoy.filter((c) => c.tour === "barco").reduce((s, c) => s + (c.capacidad - c.ocupados), 0);
  const librHeli = cuposHoy.filter((c) => c.tour === "helicoptero").reduce((s, c) => s + (c.capacidad - c.ocupados), 0);

  const stats = [
    { label: "Ventas hoy", value: ventasHoy.length, color: "#14110D" },
    { label: "Ingresos hoy", value: fmtCOP(ingresosHoy), color: "#F4A93B" },
    { label: "Comisiones hoy", value: fmtCOP(comisionesHoy), color: "#E8642B" },
    { label: "Cupos libres hoy", value: `${librBarco} barco · ${librHeli} heli`, color: "#F4A93B" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: "#fff", border: `1.5px solid ${s.color}33`, borderRadius: 4, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: "#12242A88", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: "'Oswald', sans-serif", color: "#14110D", textTransform: "uppercase", letterSpacing: 0.5, fontSize: 16, marginBottom: 10 }}>Ventas en tiempo real</h3>
      {ventas.length === 0 ? (
        <EmptyState text="Aún no hay ventas registradas. Cuando un comercial registre una, aparecerá aquí al instante." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ventas.map((v) => {
            const meta = TOUR_META[v.tour];
            const expanded = expandedId === v.id;
            const tiposResumen = Object.entries(v.pasajeros.reduce((acc, p) => { acc[p.tipoTour] = (acc[p.tipoTour] || 0) + 1; return acc; }, {})).map(([t, n]) => `${n}× ${t}`).join(" · ");
            return (
              <div key={v.id} style={{ background: "#fff", border: "1px solid #14110D1a", borderLeft: `4px solid ${meta.color}`, borderRadius: 3, padding: "10px 14px" }}>
                <div onClick={() => setExpandedId(expanded ? null : v.id)} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", cursor: "pointer" }}>
                  <meta.Icon size={16} color={meta.color} />
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tiposResumen}</div>
                    <div style={{ fontSize: 11.5, color: "#12242A88" }}>{v.comercialName} · {fmtDateLabel(v.fecha)} {v.horario}</div>
                  </div>
                  <Stamp color={meta.color}>{v.pasajeros.length} pax</Stamp>
                  {v.formaPago && <Stamp color="#14110D">{v.formaPago}</Stamp>}
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginLeft: "auto" }}>{fmtCOP(v.precio)}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#E8642B" }}>com. {fmtCOP(v.comision)}</div>
                  {expanded ? <ChevronUp size={16} color="#12242A88" /> : <ChevronDown size={16} color="#12242A88" />}
                </div>
                {expanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #14110D22" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {v.pasajeros.map((p, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12.5, background: "#F6EEDD55", borderRadius: 3, padding: "6px 10px" }}>
                          <strong>{p.nombre}</strong>
                          <span style={{ color: "#12242A88" }}>{p.documento}</span>
                          <span style={{ color: "#12242A88" }}>{p.edad} años</span>
                          <span style={{ color: "#12242A88" }}>{p.pais}</span>
                          <span style={{ color: meta.color, fontWeight: 600 }}>{p.tipoTour}</span>
                        </div>
                      ))}
                    </div>
                    {v.tieneComprobante ? (
                      <button onClick={() => setViewingComprobante(v.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${meta.color}`, color: meta.color, borderRadius: 3, padding: "6px 12px", fontSize: 12.5, cursor: "pointer" }}>
                        <ImageIcon size={14} /> Ver comprobante
                      </button>
                    ) : (
                      <Stamp color="#c0392b">Sin comprobante · pago en efectivo</Stamp>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {viewingComprobante && <ComprobanteModal ventaId={viewingComprobante} onClose={() => setViewingComprobante(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN: programar cupos
------------------------------------------------------------------*/
function Cupos() {
  const [cupos, setCupos] = useState([]);
  const [tour, setTour] = useState("barco");
  const [fecha, setFecha] = useState(todayStr());
  const [horario, setHorario] = useState("09:00");
  const [capacidad, setCapacidad] = useState(20);
  const [err, setErr] = useState("");

  const load = useCallback(async () => { try { setCupos(await api.cupos()); } catch (e) {} }, []);
  useEffect(() => { load(); }, [load]);

  const addCupo = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.addCupo({ tour, fecha, horario, capacidad: Number(capacidad) });
      load();
    } catch (e) { setErr(e.message); }
  };
  const delCupo = async (id) => { await api.deleteCupo(id); load(); };

  const porFecha = {};
  cupos.forEach((c) => { (porFecha[c.fecha] = porFecha[c.fecha] || []).push(c); });
  const fechas = Object.keys(porFecha).sort();

  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid #14110D1a", borderRadius: 4, padding: 18, marginBottom: 22 }}>
        <h3 style={{ fontFamily: "'Oswald', sans-serif", color: "#14110D", textTransform: "uppercase", fontSize: 15, marginTop: 0 }}>Programar nuevo cupo</h3>
        <form onSubmit={addCupo} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={miniLabel}>Tour</label>
            <select value={tour} onChange={(e) => setTour(e.target.value)} style={{ ...inputStyle, width: 150 }}>
              <option value="barco">Barco</option>
              <option value="helicoptero">Helicóptero</option>
            </select>
          </div>
          <div>
            <label style={miniLabel}>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ ...inputStyle, width: 150 }} />
          </div>
          <div>
            <label style={miniLabel}>Horario</label>
            <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} style={{ ...inputStyle, width: 110 }} />
          </div>
          <div>
            <label style={miniLabel}>Capacidad</label>
            <input type="number" min="1" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} style={{ ...inputStyle, width: 90 }} />
          </div>
          <button type="submit" style={{ ...primaryBtn, width: "auto", padding: "10px 18px", marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Agregar
          </button>
        </form>
        {err && <div style={{ color: "#c0392b", fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      </div>

      {fechas.length === 0 ? (
        <EmptyState text="No hay cupos programados todavía." />
      ) : (
        fechas.map((f) => (
          <div key={f} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "#14110D", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>{fmtDateLabel(f)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
              {porFecha[f].sort((a, b) => a.horario.localeCompare(b.horario)).map((c) => {
                const meta = TOUR_META[c.tour];
                const pct = Math.min(100, (c.ocupados / c.capacidad) * 100);
                return (
                  <div key={c.id} style={{ background: "#fff", border: `1px solid ${meta.color}55`, borderRadius: 3, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13.5, color: meta.color }}><meta.Icon size={14} /> {c.horario}</span>
                      <button onClick={() => delCupo(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b88" }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ fontSize: 12, color: "#12242A88", margin: "4px 0" }}>{c.ocupados} / {c.capacidad} ocupados</div>
                    <div style={{ background: "#14110D14", borderRadius: 999, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, background: meta.color, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN: tipos de tour
------------------------------------------------------------------*/
function TiposTour() {
  const [tiposTour, setTiposTour] = useState({ barco: [], helicoptero: [] });
  const [tour, setTour] = useState("barco");
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState("");
  const meta = TOUR_META[tour];

  const load = useCallback(async () => { try { setTiposTour(await api.tiposTour()); } catch (e) {} }, []);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setErr("");
    if (!nombre.trim()) return;
    try { await api.addTipoTour(tour, nombre.trim()); setNombre(""); load(); }
    catch (e) { setErr(e.message); }
  };
  const rename = async (oldVal, newVal) => {
    if (!newVal.trim() || newVal === oldVal) return;
    await api.renameTipoTour(tour, oldVal, newVal.trim()); load();
  };
  const del = async (val) => { await api.deleteTipoTour(tour, val); load(); };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {Object.entries(TOUR_META).map(([key, m]) => (
          <button key={key} onClick={() => setTour(key)} style={{ flex: 1, padding: "9px 0", borderRadius: 3, border: `1.5px solid ${m.color}`, background: tour === key ? m.color : "#fff", color: tour === key ? "#fff" : m.color, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Inter', sans-serif" }}>
            <m.Icon size={14} /> {m.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #14110D1a", borderRadius: 4, padding: 18, marginBottom: 22 }}>
        <h3 style={{ fontFamily: "'Oswald', sans-serif", color: "#14110D", textTransform: "uppercase", fontSize: 15, marginTop: 0 }}>Nuevo tipo de tour — {meta.label}</h3>
        <form onSubmit={add} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={miniLabel}>Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Tour Privado VIP" style={inputStyle} />
          </div>
          <button type="submit" style={{ ...primaryBtn, background: meta.color, width: "auto", padding: "10px 18px", marginTop: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={15} /> Agregar
          </button>
        </form>
        {err && <div style={{ color: "#c0392b", fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(tiposTour[tour] || []).map((t) => (
          <div key={t} style={{ background: "#fff", border: `1px solid ${meta.color}55`, borderRadius: 3, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <input defaultValue={t} onBlur={(e) => rename(t, e.target.value)} style={{ ...inputStyle, marginTop: 0, border: "1px solid transparent", flex: 1 }} />
            <button onClick={() => del(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b88" }}><Trash2 size={15} /></button>
          </div>
        ))}
        {(tiposTour[tour] || []).length === 0 && <EmptyState text={`Aún no hay tipos de tour para ${meta.label}. Agrega el primero arriba.`} />}
      </div>
      <p style={{ fontSize: 12, color: "#12242A77", marginTop: 12 }}>Edita el nombre y presiona fuera del campo para guardar el cambio.</p>
    </div>
  );
}

/* ---------------------------------------------------------------
   ADMIN: comerciales
------------------------------------------------------------------*/
function FotoComercialModal({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try { setData(await api.fotoUsuario(userId)); }
      catch (e) { setError(true); }
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "#14110Dcc", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 4, padding: 14, maxWidth: 340, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", textTransform: "uppercase", fontSize: 14, color: "#14110D" }}>Foto</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>
        {loading && <div style={{ padding: 30, textAlign: "center", color: "#12242A88" }}>Cargando...</div>}
        {!loading && error && <div style={{ padding: 30, textAlign: "center", color: "#c0392b" }}>No hay foto guardada.</div>}
        {!loading && data && <img src={data.dataUrl} alt="Foto del comercial" style={{ width: "100%", borderRadius: 3 }} />}
      </div>
    </div>
  );
}

function emptyComercialForm() {
  return { nombre: "", apellido: "", cedula: "", telefono: "", email: "", direccion: "", fechaNacimiento: "", fechaIngreso: todayStr(), comisionDefault: "10", username: "", password: "" };
}

function Comerciales() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyComercialForm());
  const [foto, setFoto] = useState(null);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewingFoto, setViewingFoto] = useState(null);

  const load = useCallback(async () => { try { setUsers(await api.usuarios()); } catch (e) {} }, []);
  useEffect(() => { load(); }, [load]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onFotoChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setComprimiendo(true);
    try { setFoto(await compressImage(file)); }
    catch (err) { setErr("No se pudo procesar la foto."); }
    setComprimiendo(false);
  };

  const add = async (e) => {
    e.preventDefault();
    setErr("");
    const required = ["nombre", "apellido", "cedula", "telefono", "email", "direccion", "fechaNacimiento", "fechaIngreso", "comisionDefault", "username", "password"];
    for (const f of required) {
      if (!String(form[f]).trim()) return setErr("Completa todos los campos.");
    }
    if (!foto) return setErr("Toma o sube la foto del comercial antes de continuar.");
    setSaving(true);
    try {
      await api.addUsuario({ ...form, comisionDefault: Number(form.comisionDefault), fotoDataUrl: foto });
      setForm(emptyComercialForm());
      setFoto(null);
      load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };
  const del = async (id) => { await api.deleteUsuario(id); load(); };

  const field = (label, key, type = "text", width = 160) => (
    <div>
      <label style={miniLabel}>{label}</label>
      <input type={type} value={form[key]} onChange={(e) => setField(key, e.target.value)} style={{ ...inputStyle, width }} />
    </div>
  );

  return (
    <div>
      <div style={{ background: "#fff", border: "1px solid #14110D1a", borderRadius: 4, padding: 18, marginBottom: 22 }}>
        <h3 style={{ fontFamily: "'Oswald', sans-serif", color: "#14110D", textTransform: "uppercase", fontSize: 15, marginTop: 0 }}>Nuevo comercial</h3>
        <form onSubmit={add}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {field("Nombre", "nombre")}
            {field("Apellido", "apellido")}
            {field("Cédula", "cedula")}
            {field("Teléfono", "telefono")}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {field("Correo electrónico", "email", "email", 220)}
            {field("Dirección", "direccion", "text", 220)}
            {field("Fecha de nacimiento", "fechaNacimiento", "date", 160)}
            {field("Fecha de ingreso", "fechaIngreso", "date", 160)}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
            {field("% comisión por defecto", "comisionDefault", "number", 130)}
            {field("Usuario", "username", "text", 150)}
            {field("Contraseña", "password", "text", 150)}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={miniLabel}>Fotografía *</label>
            {foto ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                <img src={foto} alt="Foto" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: "50%", border: "2px solid #F4A93B" }} />
                <button type="button" onClick={() => setFoto(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1px solid #c0392b55", color: "#c0392b", borderRadius: 3, padding: "6px 10px", cursor: "pointer", fontSize: 12.5 }}>
                  <X size={13} /> Quitar foto
                </button>
              </div>
            ) : (
              <label style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px dashed #14110D88", borderRadius: 3, padding: "9px 14px", color: "#14110D", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                {comprimiendo ? <Loader2 size={15} className="tc-spin" /> : <Camera size={15} />}
                {comprimiendo ? "Procesando..." : "Tomar foto con la cámara"}
                <input type="file" accept="image/*" capture="user" onChange={onFotoChange} style={{ display: "none" }} />
              </label>
            )}
          </div>

          <button type="submit" disabled={saving} style={{ ...primaryBtn, width: "auto", padding: "10px 18px", marginTop: 0, display: "flex", alignItems: "center", gap: 6, opacity: saving ? 0.7 : 1 }}>
            <UserPlus size={15} /> {saving ? "Creando..." : "Crear acceso"}
          </button>
        </form>
        {err && <div style={{ color: "#c0392b", fontSize: 12.5, marginTop: 8 }}>{err}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={{ background: "#fff", border: "1px solid #14110D1a", borderRadius: 3, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => u.tieneFoto && setViewingFoto(u.id)}
              style={{ width: 40, height: 40, borderRadius: "50%", background: "#F6EEDD", border: "1.5px solid #F4A93B", display: "flex", alignItems: "center", justifyContent: "center", cursor: u.tieneFoto ? "pointer" : "default", padding: 0, overflow: "hidden", flexShrink: 0 }}
            >
              {u.tieneFoto ? <ImageIcon size={16} color="#F4A93B" /> : <UserPlus size={16} color="#F4A93B88" />}
            </button>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{u.name} <span style={{ fontWeight: 400, color: "#12242A88", fontSize: 12 }}>· @{u.username}</span></div>
              <div style={{ fontSize: 11.5, color: "#12242A88", display: "flex", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {u.cedula && <span>CC {u.cedula}</span>}
                {u.telefono && <span>{u.telefono}</span>}
                {u.email && <span>{u.email}</span>}
                {u.comisionDefault != null && <span style={{ color: "#E8642B", fontWeight: 600 }}>{u.comisionDefault}% comisión</span>}
              </div>
            </div>
            <button onClick={() => del(u.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b88" }}><Trash2 size={15} /></button>
          </div>
        ))}
        {users.length === 0 && <EmptyState text="Aún no has creado accesos para comerciales." />}
      </div>
      {viewingFoto && <FotoComercialModal userId={viewingFoto} onClose={() => setViewingFoto(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------
   ROOT APP
------------------------------------------------------------------*/
export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [tiposTour, setTiposTourState] = useState({ barco: [], helicoptero: [] });
  const [tab, setTab] = useState("resumen");

  useEffect(() => {
    ensureFonts();
    (async () => {
      const token = getToken();
      if (token) {
        try {
          const { user } = await api.me();
          setUser(user);
        } catch (e) {
          setToken(null);
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    api.tiposTour().then(setTiposTourState).catch(() => {});
    setTab(user.role === "admin" ? "resumen" : "registrar");
  }, [user]);

  const onLogout = () => { setToken(null); setUser(null); };

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#14110D", color: "#F6EEDD", fontFamily: "'Inter', sans-serif" }}>
        <RefreshCw size={18} style={{ marginRight: 8 }} className="tc-spin" /> Cargando manifiesto...
      </div>
    );
  }
  if (!user) return <Login onLogin={setUser} />;

  const adminTabs = [
    { key: "resumen", label: "Ventas en tiempo real" },
    { key: "cupos", label: "Programar cupos" },
    { key: "tipos", label: "Tipos de tour" },
    { key: "comerciales", label: "Comerciales" },
  ];
  const comercialTabs = [
    { key: "registrar", label: "Registrar venta" },
    { key: "misventas", label: "Mis ventas" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F6F2E7", fontFamily: "'Inter', sans-serif" }}>
      <Topbar user={user} onLogout={onLogout} tabs={user.role === "admin" ? adminTabs : comercialTabs} tab={tab} setTab={setTab} />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: user.role === "admin" ? "24px 20px 60px" : 0 }}>
        {user.role === "admin" ? (
          <>
            {tab === "resumen" && <Resumen />}
            {tab === "cupos" && <Cupos />}
            {tab === "tipos" && <TiposTour />}
            {tab === "comerciales" && <Comerciales />}
          </>
        ) : (
          <>
            {tab === "misventas" ? <MisVentas user={user} /> : <VentaForm user={user} tiposTour={tiposTour} />}
          </>
        )}
      </div>
    </div>
  );
}
