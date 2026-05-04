export const API = "http://localhost:3000";
const BASE_URL = API;

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("API nicht erreichbar. Ist der Server gestartet?");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Serverfehler (HTTP ${res.status})`);
  }

  return res.json();
}

export const api = {
  getPruefungen: () =>
    request("/api/pruefungen"),

  getPruefungErgebnisse: (id) =>
    request(`/api/pruefungen/${id}/ergebnisse`),

  getNotenschluessel: () =>
    request("/api/notenschluessel"),

  auswerten: (data) =>
    request("/api/pruefung/auswerten", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  batchAuswerten: (data) =>
    request("/api/pruefungen/batch", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
