export const API = "https://punktescanner-iii.onrender.com";
const BASE_URL = API;

async function request(path, options = {}) {
  let res;
  try {
    const isFormData = options.body instanceof FormData;
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: isFormData ? {} : { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw new Error("API nicht erreichbar. Ist der Server gestartet?");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const safeBody = body ?? {};
    throw new Error(safeBody.message || safeBody.fehler || `Serverfehler (HTTP ${res.status})`);
  }

  return res.json();
}

export const api = {
  getPruefungen: () =>
    request("/api/pruefungen"),

  createPruefung: (data) =>
    request("/api/pruefungen", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPruefungErgebnisse: (id) =>
    request(`/api/pruefungen/${id}/ergebnisse`),

  getAufgaben: (pruefungId) =>
    request(`/api/pruefungen/${pruefungId}/aufgaben`),

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

  pruefungAnlegen: (data) =>
    request("/api/pruefungen/anlegen", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  studentSuchen: (matNr) =>
    request(`/api/studenten/matnr/${encodeURIComponent(matNr)}`),

  studentAnlegen: (matNr, name = "") =>
    request("/api/studenten", {
      method: "POST",
      body: JSON.stringify({ matNr, name: name || undefined }),
    }),

  ocrScan: (pruefungId, dateien) => {
    const form = new FormData();
    form.append("pruefungId", String(pruefungId));
    dateien.forEach((d) => form.append("dateien", d.file, d.file.name));
    return request("/api/ocr/scan", { method: "POST", body: form });
  },
};
