const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }
  return payload;
}

export const api = {
  login: (credentials) => request("/auth/login", { method: "POST", body: credentials }),
  me: (token) => request("/me", { token }),
  dashboard: (token) => request("/dashboard", { token }),
  fields: (token) => request("/fields", { token }),
  createField: (token, body) => request("/fields", { method: "POST", token, body }),
  updateField: (token, id, body) => request(`/fields/${id}`, { method: "PUT", token, body }),
  agents: (token) => request("/users/agents", { token }),
  createUpdate: (token, fieldId, body) => request(`/fields/${fieldId}/updates`, { method: "POST", token, body })
};
