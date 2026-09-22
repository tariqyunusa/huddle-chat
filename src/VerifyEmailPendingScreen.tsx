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
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center max-w-sm px-6">
        <h1 className="text-lg font-semibold text-stone-800 mb-2">Verify your email</h1>
        <p className="text-sm text-stone-500 mb-6">
          Check your inbox and click the verification link to continue.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCheckVerified}
            disabled={checking}
            className="bg-stone-800 text-white rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {checking ? "Checking…" : "I've verified"}
          </button>
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-stone-500 underline underline-offset-2 disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      </div>
    </div>
  );
}