const BACKEND_HOST = "huddle-6j42.onrender.com";
const BASE_URL = `https://${BACKEND_HOST}`;

export type SessionSummary = {
  id: string;
  title: string | null;
  created_by: string;
  created_at: string;
};

export async function signup(email: string, name: string): Promise<{ id: string }> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, display_name: name }),
  });
  if (!res.ok) throw new Error(`Signup failed: ${res.status}`);
  return res.json();
}

export async function fetchSessions(userId: string): Promise<SessionSummary[]> {
  const res = await fetch(`${BASE_URL}/sessions?created_by=${userId}`);
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json();
}

export async function createSession(userId: string, title: string): Promise<SessionSummary> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ created_by: userId, title }),
  });
  if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
  return res.json();
}

export { BACKEND_HOST };