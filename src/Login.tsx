import { useState } from "react";
import { login } from "./api";

export default function LoginForm({
  onLoggedIn,
  onSwitchToSignup,
}: {
  onLoggedIn: (userId: string) => void;
  onSwitchToSignup: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      localStorage.setItem("huddle_token", result.access_token);
      localStorage.setItem("huddle_user_id", result.user_id);
      localStorage.setItem("huddle_display_name", result.display_name);
      onLoggedIn(result.user_id);
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-white text-stone-950 p-2">
      <div className="w-1/2 relative rounded-2xl">
        <img src="/bg.webp" alt="intro-image" className="w-full h-full object-cover rounded-xl" />
      </div>
      <div className="flex flex-col justify-center items-center w-1/2">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 px-6">
          <h1 className="text-xl font-semibold tracking-tight text-center mb-2">
            Welcome back
          </h1>
          <p className="text-base text-gray-500 text-center mb-4">
            Log in to your Huddle account.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-200 text-stone-900 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
          <p className="text-sm text-center text-stone-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-stone-800 underline underline-offset-2"
            >
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}