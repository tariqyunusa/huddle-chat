import { useState } from "react";
import { forgotPassword } from "./api";
import { useToast } from "./Toast";
import AuthTransition from "./AuthTransition";

export default function ForgotPasswordForm({
  onBackToLogin,
}: {
  onBackToLogin: () => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const showToast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12 text-stone-950 dark:bg-stone-950">
      <div className="w-full max-w-md space-y-5">
          <div className="flex flex-col items-center justify-center gap-1" aria-label="Huddle">
            <img src="/huddle-logo.svg" alt="" className="h-[100px] w-[100px]" />
          </div>
          <h1 className="text-center font-lora text-3xl tracking-tight">
            Reset your password
          </h1>

          {sent ? (
            <>
              <p className="text-center text-stone-500">
                If an account exists for <strong>{email}</strong>, a reset link
                has been sent.
              </p>
              <button
                onClick={onBackToLogin}
                className="auth-button w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700"
              >
                Back to login
              </button>
            </>
          ) : (
            <AuthTransition>
              <form
              
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <p className="text-center text-stone-500">
                Enter your email and we'll send you a reset link.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                className="w-full rounded-2xl border border-stone-300 bg-white px-3 py-3 text-center text-base outline-none transition focus:border-blue-100 focus:ring-1 focus:ring-blue-50 placeholder:text-stone-400 dark:bg-stone-900"
              />
              <button
                type="submit"
                disabled={loading}
                className="auth-button w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-sm text-center text-stone-500">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-stone-800 underline underline-offset-2 no-inset cursor-pointer"
                >
                  Back to login
                </button>
              </p>
            </form>
            </AuthTransition>
          )}
      </div>
      
    </main>
  );
}
