const USERS_KEY = "pscanner_users";
const SESSION_KEY = "pscanner_session";

export function initialisiere() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  if (!users.find((u) => u.benutzername === "admin")) {
    users.push({ benutzername: "admin", passwort: "admin", rolle: "admin" });
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

export function login(benutzername, passwort) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  return users.find((u) => u.benutzername === benutzername && u.passwort === passwort) ?? null;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function aktuellerBenutzer() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setzeSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function alleBenutzer() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

export function benutzerAnlegen(benutzername, passwort) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  if (users.find((u) => u.benutzername === benutzername)) return false;
  users.push({ benutzername: benutzername.trim(), passwort, rolle: "nutzer" });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}

export function benutzerLoeschen(benutzername) {
  if (benutzername === "admin") return false;
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]").filter(
    (u) => u.benutzername !== benutzername
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return true;
}
