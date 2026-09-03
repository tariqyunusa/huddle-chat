import { useState } from "react";
import { forgotPassword } from "./api";
import { useToast } from "./Toast";

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
    <div className="flex h-screen bg-white text-stone-950 p-2">
      <div className="hidden md:block md:w-1/2 relative rounded-2xl">
        <img
          src="/bg.webp"
          alt="intro-image"
          className="w-full h-full object-cover rounded-xl"
        />
      </div>
      <div className="flex flex-col justify-center items-center w-full md:w-1/2">
        <div className="w-full max-w-sm space-y-4 px-6">
          <h1 className="text-xl font-semibold tracking-tight text-center mb-2">
            Reset your password
          </h1>

          {sent ? (
            <>
              <p className="text-base text-gray-500 text-center">
                If an account exists for <strong>{email}</strong>, a reset link
                has been sent.
              </p>
              <button
                onClick={onBackToLogin}
                className="w-full bg-stone-200 text-stone-900 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors"
              >
                Back to login
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-base text-gray-500 text-center mb-4">
                Enter your email and we'll send you a reset link.
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
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-stone-200 text-stone-900 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <p className="text-sm text-center text-stone-500">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-stone-800 underline underline-offset-2"
                >
                  Back to login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
