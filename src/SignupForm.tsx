import { useState } from "react";
import { signup, login } from "./api";
import { useToast } from "./Toast";

type Step = "name" | "email" | "password";

export default function SignupForm({ onSignedUp, onSwitchToLogin }: { onSignedUp: (userId: string) => void; onSwitchToLogin: () => void }) {
  const [step, setStep] = useState<Step>("name");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useToast();

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (step === "name") {
      if (!name.trim()) return;
      setStep("email");
    } else if (step === "email") {
      if (!email.trim()) return;
      setStep("password");
    }
  }

  function handleBack() {
    setError(null);
    if (step === "email") setStep("name");
    else if (step === "password") setStep("email");
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  if (!password.trim()) return;
  setError(null);
  setLoading(true);
  try {
    await signup(email, name, password);
    const result = await login(email, password);
    localStorage.setItem("huddle_token", result.access_token);
    localStorage.setItem("huddle_user_id", result.user_id);
    localStorage.setItem("huddle_display_name", result.display_name);
    onSignedUp(result.user_id);
  } catch (err) {
  showToast("error", err instanceof Error ? err.message : "Could not sign up. Try again.")
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
        <form
          onSubmit={step === "password" ? handleSubmit : handleNext}
          className="w-full max-w-sm space-y-4 px-6"
        >
          <h1 className="text-xl font-semibold tracking-tight text-center mb-2">
            Welcome to Huddle
          </h1>
          <p className="text-base text-gray-500 text-center mb-4">
            {step === "name" && "What should we call you?"}
            {step === "email" && "What's your email?"}
            {step === "password" && "Create a password"}
          </p>

          {step === "name" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
            />
          )}

          {step === "email" && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
            />
          )}

          {step === "password" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              minLength={8}
              className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
            />
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-2">
            {step !== "name" && (
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 bg-stone-100 text-stone-700 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-stone-200 text-stone-900 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {step === "password" ? (loading ? "Joining…" : "Continue") : "Next"}
            </button>
          </div>

          <div className="flex justify-center gap-1.5 pt-2">
            {(["name", "email", "password"] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-6 bg-stone-800" : "w-1.5 bg-stone-300"
                }`}
              />
            ))}
          </div>
            
          <p className="text-sm text-center text-stone-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-stone-800 underline underline-offset-2"
            >
              Log in
            </button>
          </p>
        </form>
        <div className="absolute bottom-4 text-xs text-stone-500 text-center">
          <p>
            Created by{" "}
            <a
              href="https://tariqyunusa.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:underline">
            
              Tariq Yunusa
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}