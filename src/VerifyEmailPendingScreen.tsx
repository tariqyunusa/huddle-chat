import { useState } from "react";
import { resendVerification, getMe } from "./api";
import { useToast } from "./Toast";

export default function VerifyEmailPendingScreen({
  onVerified,
}: {
  onVerified: () => void;
}) {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const showToast = useToast();

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification();
      showToast("success", "Verification email sent");
    } catch {
      showToast("error", "Couldn't resend email");
    } finally {
      setResending(false);
    }
  }

  async function handleCheckVerified() {
    setChecking(true);
    try {
      const me = await getMe();
      if (me.email_verified) {
        localStorage.setItem("huddle_email_verified", "true");
        onVerified();
      } else {
        showToast("error", "Still not verified — check your inbox and click the link.");
      }
    } catch {
      showToast("error", "Couldn't check verification status");
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-stone-950 dark:bg-stone-950">
      <div className="w-full max-w-md space-y-5 text-center">
        <img src="/huddle-logo.svg" alt="Huddle" className="mx-auto h-20 w-20" />
        <h1 className="font-lora text-3xl tracking-tight text-stone-950 dark:text-stone-100">Check your email</h1>
        <p className="text-stone-500">
          We sent a verification link to your email address. Open the message and click the link to verify your account.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleCheckVerified}
            disabled={checking}
            className="auth-button w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {checking ? "Checking…" : "I've verified"}
          </button>
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full rounded-2xl border border-stone-300 px-4 py-4 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-900"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      </div>
    </main>
  );
}
