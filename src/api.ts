const BACKEND_HOST = "huddle-6j42.onrender.com";
const BASE_URL = `https://${BACKEND_HOST}`;

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
  token_type: string;
  user_id: string;
  display_name: string;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("huddle_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function signup(email: string, name: string, password: string): Promise<{ id: string }> {
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
  const res = await fetch(`${BASE_URL}/sessions`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json();
}


export async function createSession( title: string): Promise<SessionSummary> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({  title }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export async function fetchParticipants(sessionId: string): Promise<Participant[]> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/participants`, {
    headers: authHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch participants: ${res.status}`);
  return res.json();
}



export async function login(email:string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json"},
    body: JSON.stringify({ email, password})
  })
  if(!res.ok) throw new Error(`Login failed: ${res.status}`)
  return res.json();
}

export async function forgotPassword(email: string): Promise< {message: string}> {
  const res = await fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json"},
    body: JSON.stringify({ email }),
  });
  if(!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Something went wrong. Try again.");
  }
  return res.json();
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string}> {
  const res = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-type": "application/json"},
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  if(!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? "Invalid or expired link.")
  }
  return res.json()
}
export { BACKEND_HOST };