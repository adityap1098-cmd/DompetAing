const API_BASE = import.meta.env.VITE_API_URL ?? "/v1";

export function initiateGoogleLogin() {
  window.location.href = `${API_BASE}/auth/google`;
}

export function logout() {
  return fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
