const TOKEN_KEY = "volar_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(path, { ...opts, headers });
  if (res.status === 401) {
    setToken(null);
  }
  if (!res.ok) {
    let msg = "Error de servidor.";
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch (e) {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  login: (username, password) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => apiFetch("/api/me"),
  tiposTour: () => apiFetch("/api/tipos-tour"),
  addTipoTour: (tour, nombre) => apiFetch("/api/tipos-tour", { method: "POST", body: JSON.stringify({ tour, nombre }) }),
  renameTipoTour: (tour, nombreAnterior, nombreNuevo) =>
    apiFetch("/api/tipos-tour", { method: "PUT", body: JSON.stringify({ tour, nombreAnterior, nombreNuevo }) }),
  deleteTipoTour: (tour, nombre) => apiFetch("/api/tipos-tour", { method: "DELETE", body: JSON.stringify({ tour, nombre }) }),
  cupos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch("/api/cupos" + (qs ? `?${qs}` : ""));
  },
  addCupo: (cupo) => apiFetch("/api/cupos", { method: "POST", body: JSON.stringify(cupo) }),
  deleteCupo: (id) => apiFetch(`/api/cupos/${id}`, { method: "DELETE" }),
  ventas: () => apiFetch("/api/ventas"),
  addVenta: (venta) => apiFetch("/api/ventas", { method: "POST", body: JSON.stringify(venta) }),
  comprobante: (ventaId) => apiFetch(`/api/comprobante/${ventaId}`),
  usuarios: () => apiFetch("/api/usuarios"),
  addUsuario: (u) => apiFetch("/api/usuarios", { method: "POST", body: JSON.stringify(u) }),
  deleteUsuario: (id) => apiFetch(`/api/usuarios/${id}`, { method: "DELETE" }),
};
