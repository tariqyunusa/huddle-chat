import { useEffect, useState } from "react";
import SignupForm from "./SignupForm";
import { fetchSessions, type SessionSummary } from "./api";

function App() {
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem("huddle_user_id")
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    if (!userId) return;
    fetchSessions(userId)
      .then(setSessions)
      .catch((err) => console.error("Failed to load sessions:", err));
  }, [userId]);

  if (!userId) {
    return <SignupForm onSignedUp={setUserId} />;
  }

  // Temporary — just proving the data flow. Real sidebar/layout comes in Brick F4.
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-6">
      <h1 className="text-lg font-semibold mb-4">Your sessions</h1>
      <pre className="text-sm text-stone-400">{JSON.stringify(sessions, null, 2)}</pre>
    </div>
  );
}

export default App;