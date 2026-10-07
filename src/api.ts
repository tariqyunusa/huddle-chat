const BACKEND_HOST =
  import.meta.env.VITE_BACKEND_HOST || "huddle-6j42.onrender.com";
const isLocal =
  BACKEND_HOST.includes("localhost") || BACKEND_HOST.includes("127.0.0.1");
const BASE_URL = `${isLocal ? "http" : "https"}://${BACKEND_HOST}`;

export type SessionSummary = {
  id: string;
  title: string | null;
  created_by: string;
  created_at: string;
};

export type Participant = {
  user_id: string;
  display_name: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  display_name: string;
  email_verified: boolean;
  plan: string;
};

export type UserSearchResult = { id: string; display_name: string };

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("huddle_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearSession() {
  localStorage.removeItem("huddle_token");
  localStorage.removeItem("huddle_refresh_token");
  localStorage.removeItem("huddle_user_id");
  localStorage.removeItem("huddle_display_name");
  localStorage.removeItem("huddle_email_verified");
  localStorage.removeItem("huddle_plan");
}

// Deduplicates concurrent refreshes — several calls hitting 401 at once
// should trigger one /refresh, not one per call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("huddle_refresh_token");
  if (!refreshToken) {
    clearSession();
    throw new Error("No refresh token");
  }

  const res = await fetch(`${BASE_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    throw new Error("Session expired");
  }

  const data: LoginResponse = await res.json();
  localStorage.setItem("huddle_token", data.access_token);
  localStorage.setItem("huddle_refresh_token", data.refresh_token);
  localStorage.setItem("huddle_plan", data.plan);
  return data.access_token;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...options.headers, ...authHeaders() },
  });

  if (res.status !== 401) return res;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  try {
    const newToken = await refreshPromise;
    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
    });
  } catch {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
}

export async function getMe(): Promise<{
  id: string;
  email_verified: boolean;
  display_name: string;
  plan: string;
}> {
  const res = await apiFetch("/me");
  if (!res.ok) throw new Error("Failed to fetch user status");
  return res.json();
}

export async function signup(
  email: string,
  name: string,
  password: string,
): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, display_name: name, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Signup failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchSessions(): Promise<SessionSummary[]> {
  const res = await apiFetch("/sessions");
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json();
}

export async function createSession(title: string): Promise<SessionSummary> {
  const res = await apiFetch("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function fetchParticipants(
  sessionId: string,
): Promise<Participant[]> {
  const res = await apiFetch(`/sessions/${sessionId}/participants`);
  if (!res.ok) throw new Error(`Failed to fetch participants: ${res.status}`);
  return res.json();
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    throw new Error(`Login failed: ${res.status}`);
  }
  const data: LoginResponse = await res.json();
  localStorage.setItem("huddle_token", data.access_token);
  localStorage.setItem("huddle_refresh_token", data.refresh_token);
  localStorage.setItem("huddle_plan", data.plan);
  return data;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("huddle_refresh_token");
  if (refreshToken) {
    try {
      await fetch(`${BASE_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Best-effort — clear local session regardless of whether the server call succeeded
    }
  }
  clearSession();
}

export async function forgotPassword(
  email: string,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Something went wrong. Try again.");
  }
  return res.json();
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Invalid or expired link.");
  }
  return res.json();
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const res = await apiFetch(
    `/users/search?query=${encodeURIComponent(query)}`,
  );
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function inviteToSession(
  sessionId: string,
  payload: { email?: string; user_id?: string },
): Promise<void> {
  const res = await apiFetch(`/sessions/${sessionId}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to send invite");
  }
}

export async function createSessionInviteLink(
  sessionId: string,
): Promise<{ token: string }> {
  const res = await apiFetch(`/sessions/${sessionId}/invite-link`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Couldn't create an invite link");
  }
  return res.json();
}

export async function redeemSessionInviteLink(
  token: string,
): Promise<SessionSummary> {
  const res = await apiFetch("/sessions/invite-link/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "This invite link couldn't be redeemed");
  }
  return res.json();
}

export async function renameSession(
  sessionId: string,
  title: string,
): Promise<SessionSummary> {
  const res = await apiFetch(`/sessions/${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error("Failed to rename session");
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await apiFetch(`/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to delete session");
  }
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(
    `${BASE_URL}/verify-email?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
    },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Invalid or expired link.");
  }
  return res.json();
}

export async function resendVerification(): Promise<{ message: string }> {
  const res = await apiFetch("/resend-verification", { method: "POST" });
  if (!res.ok) throw new Error("Couldn't resend verification email");
  return res.json();
}

export { BACKEND_HOST };
