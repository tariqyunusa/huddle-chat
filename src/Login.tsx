import { useState } from "react";
import { login } from "./api";
import { useToast } from "./Toast";
import { Eye, EyeOff } from "lucide-react";
import AuthTransition from "./AuthTransition";

export default function LoginForm({
  onLoggedIn,
  onSwitchToSignup,
  onForgotPassword,
}: {
  onLoggedIn: (userId: string) => void;
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const showToast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      localStorage.setItem("huddle_user_id", result.user_id);
      localStorage.setItem("huddle_display_name", result.display_name);
      localStorage.setItem(
        "huddle_email_verified",
        String(result.email_verified),
      );
      onLoggedIn(result.user_id);
    } catch (err) {
      if (err instanceof Error && err.message === "RATE_LIMITED") {
        showToast(
          "error",
          "Too many login attempts. Please wait a few minutes and try again.",
        );
      } else {
        showToast("error", "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12 text-stone-950 dark:bg-stone-950">
      <AuthTransition>
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <div
            className="flex flex-col items-center justify-center gap-1"
            aria-label="Huddle"
          >
            <img
              src="/huddle-logo.svg"
              alt=""
              className="h-[100px] w-[100px]"
            />
          </div>
          <h1 className="text-center font-lora text-3xl tracking-tight">
            Welcome back
          </h1>
          <p className="text-center text-stone-500">
            Log in to your Huddle account.
          </p>
          <a
            href={`${import.meta.env.VITE_BACKEND_HOST?.includes("localhost") ? "http" : "https"}://${import.meta.env.VITE_BACKEND_HOST || "huddle-6j42.onrender.com"}/auth/google`}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-stone-300 bg-white px-4 py-4 text-base font-medium transition hover:bg-stone-50 dark:bg-stone-900"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.98 46.98 31.8 46.98 24.55Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
                  />
                </svg>
            Continue with Google
          </a>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-3 text-center text-base outline-none transition focus:border-blue-100 focus:ring-1 focus:ring-blue-50 placeholder:text-stone-400 dark:bg-stone-900"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-3 pr-10 text-center text-base outline-none transition focus:border-blue-100 focus:ring-1 focus:ring-blue-50 placeholder:text-stone-400 dark:bg-stone-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 no-inset hover:text-stone-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <p className="text-sm text-center text-stone-500">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-stone-800 underline underline-offset-2 no-inset cursor-pointer"
            >
              Forgot password?
            </button>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="auth-button w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
          <p className="text-sm text-center text-stone-500">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-stone-800 underline underline-offset-2 no-inset cursor-pointer"
            >
              Sign up
            </button>
          </p>
        </form>
      </AuthTransition>
      <div className="absolute bottom-4 text-xs text-stone-500 text-center">
        <p>
          Created by{" "}
          <a
            href="https://tariqyunusa.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:underline cursor-pointer"
          >
            Tariq Yunusa
          </a>
        </p>
      </div>
    </main>
  );
}
