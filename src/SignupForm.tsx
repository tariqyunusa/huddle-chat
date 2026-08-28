import { useState } from "react";
import { signup } from "./api";

export default function SignupForm({ onSignedUp }: { onSignedUp: (userId: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await signup(email, name);
      localStorage.setItem("huddle_user_id", user.id);
      localStorage.setItem("huddle_display_name", name);
      onSignedUp(user.id);
    } catch (err) {
      setError("Could not sign up. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-stone-950 text-stone-100 p-4">
      <div className="w-1/2 relative rounded-2xl">
        <img src="/bg.webp" alt="intro-image" className="w-full h-full object-cover rounded-2xl"/>
      </div>
      <div className="flex flex-col justify-center items-center w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 px-6">
        <h1 className="text-xl font-semibold tracking-tight text-center mb-6">
          Welcome to Huddle
        </h1>
        <p className="text-base text-gray-500 text-center">
          Sign in to your account or create a new one to start collaborating in real-time.
        </p>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-4 py-2 text-sm outline-none focus:border-stone-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full bg-stone-900 border border-stone-700 rounded-2xl px-4 py-2 text-sm outline-none focus:border-stone-500"
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-100 text-stone-900 rounded-2xl px-4 py-2 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Joining…" : "Continue"}
        </button>
      </form>
      <div className="absolute bottom-4 text-xs text-stone-500 text-center">
        <p>Created by <a href="https://tariqyunusa.xyz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline">Tariq Yunusa</a></p>
      </div>
      </div>
    </div>
  );
}