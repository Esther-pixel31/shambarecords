const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    method: options.method || "GET",
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export const api = {
  login: (credentials) =>
    request("/api/auth/login", { method: "POST", body: credentials }),

  me: (token) =>
    request("/api/me", { token }),

  dashboard: (token) =>
    request("/api/dashboard", { token }),

  fields: (token) =>
    request("/api/fields", { token }),

  createField: (token, body) =>
    request("/api/fields", { method: "POST", token, body }),

  updateField: (token, id, body) =>
    request(`/api/fields/${id}`, { method: "PUT", token, body }),

  agents: (token) =>
    request("/api/users/agents", { token }),

  createUpdate: (token, fieldId, body) =>
    request(`/api/fields/${fieldId}/updates`, { method: "POST", token, body })
};
