import { useEffect, useState } from "react";
import SignupForm from "./SignupForm";
import ChatView from "./chatView";
import { fetchSessions, createSession, type SessionSummary } from "./api";
import Login from "./Login";

function getSessionFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("session");
}

function App() {
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("huddle_user_id"),
  );

  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [displayName, setDisplayName] = useState<string>(
    localStorage.getItem("huddle_display_name") ?? "Anonymous",
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    getSessionFromUrl(),
  );
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchSessions()
      .then(setSessions)
      .catch((err) => console.error("Failed to load sessions:", err));
  }, [userId]);

  function openSession(id: string) {
    setActiveSessionId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("session", id);
    window.history.pushState({}, "", url);
  }


  function handleTitleUpdate(sessionId: string, title: string) {
  setSessions((prev) =>
    prev.map((s) => (s.id === sessionId ? { ...s, title } : s))
  );
}

  async function handleCreateSession() {
    if (!userId) return;
    setCreating(true);
    try {
      const newSession = await createSession("New session");
      setSessions((prev) => [newSession, ...prev]);
      openSession(newSession.id);
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  }

  if (!userId) {
    return authMode === "signup" ? (
      <SignupForm
        onSignedUp={(id) => {
          setUserId(id);
          setDisplayName(
            localStorage.getItem("huddle_display_name") ?? "Anonymous",
          );
        }}
        onSwitchToLogin={() => setAuthMode("login")}
      />
    ) : (
      <Login
        onLoggedIn={(id) => {
          setUserId(id);
          setDisplayName(
            localStorage.getItem("huddle_display_name") ?? "Anonymous",
          );
        }}
        onSwitchToSignup={() => setAuthMode("signup")}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white text-stone-800">
      <aside className="w-64 bg-stone-50 border-r border-stone-200 flex flex-col">
        <div className="px-3 py-3">
          <button
            onClick={handleCreateSession}
            disabled={creating}
            className="w-full flex items-center gap-2 rounded-lg border cursor-pointer border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-white transition-colors disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            {creating ? "Creating…" : "New session"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <p className="px-2 py-2 text-xs font-medium text-stone-400 uppercase tracking-wide">
            Sessions
          </p>
          {sessions.length === 0 && (
            <p className="px-2 py-2 text-sm text-stone-400">No sessions yet</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                activeSessionId === s.id
                  ? "bg-stone-200 text-stone-900"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {s.title || "Untitled session"}
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-stone-200">
          <p className="text-sm font-medium text-stone-700">{displayName}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {activeSessionId ? (
          <ChatView sessionId={activeSessionId} displayName={displayName} onTitleUpdate={handleTitleUpdate} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center ">
              <div className="w-24 h-24 ">
                <img src="/icon_black.svg" alt="black logo" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-2xl font-semibold text-stone-800">
              Start a session with Talon
            </h1>
            </div>
            <p className="text-stone-500 text-sm max-w-sm text-center">
              Create a session, invite others, and reason through anything
              together.
            </p>
            <button
              onClick={handleCreateSession}
              disabled={creating}
              className="bg-stone-800 text-white rounded-lg px-5 py-2.5 text-sm cursor-pointer font-medium hover:bg-stone-900 transition-colors disabled:opacity-50"
            >
              {creating ? "Creating…" : "New session"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
