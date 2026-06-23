const TOKEN_KEY = "transport_erp_token";
const USER_KEY = "transport_erp_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    clearSession();
    window.location.href = "/login";
    return null;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  login: (employeeId, password) =>
    request("/auth/login", { method: "POST", body: { employeeId, password }, auth: false }),

  vehicles: {
    list: () => request("/vehicles"),
    create: (payload) => request("/vehicles", { method: "POST", body: payload }),
    update: (id, payload) => request(`/vehicles/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/vehicles/${id}`, { method: "DELETE" }),
  },

  clients: {
    list: () => request("/clients"),
    create: (payload) => request("/clients", { method: "POST", body: payload }),
    update: (id, payload) => request(`/clients/${id}`, { method: "PATCH", body: payload }),
    remove: (id) => request(`/clients/${id}`, { method: "DELETE" }),
  },

  lrs: {
    list: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
      ).toString();
      return request(`/lrs${qs ? `?${qs}` : ""}`);
    },
    get: (id) => request(`/lrs/${id}`),
    create: (payload) => request("/lrs", { method: "POST", body: payload }),
    update: (id, payload) => request(`/lrs/${id}`, { method: "PATCH", body: payload }),
    setStatus: (id, status, note) =>
      request(`/lrs/${id}/status`, { method: "PATCH", body: { status, note } }),
    summary: () => request("/lrs/stats/summary"),
    gatePending: () => request("/lrs/gate/pending"),
    gateLog: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
      ).toString();
      return request(`/lrs/gate/log${qs ? `?${qs}` : ""}`);
    },
    deliveryPending: () => request("/lrs/delivery/pending"),
    deliveryLog: (params = {}) => {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
      ).toString();
      return request(`/lrs/delivery/log${qs ? `?${qs}` : ""}`);
    },
    updateItems: (id, items) => request(`/lrs/${id}/items`, { method: "PATCH", body: { items } }),
    reconciliationSummary: () => request("/lrs/reconciliation/summary"),
  },
};
