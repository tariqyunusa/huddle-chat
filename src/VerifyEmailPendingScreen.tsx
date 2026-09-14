import { useState } from "react";
import { resendVerification } from "./api";
import { useToast } from "./Toast";

export default function VerifyEmailPendingScreen({ onVerified }: { onVerified: () => void }) {
  const [resending, setResending] = useState(false);
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

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center max-w-sm px-6">
        <h1 className="text-lg font-semibold text-stone-800 mb-2">Verify your email</h1>
        <p className="text-sm text-stone-500 mb-6">
          Check your inbox and click the verification link to continue. Once verified, refresh this page.
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => window.location.reload()}
            className="bg-stone-800 text-white rounded-xl px-4 py-2 text-sm font-medium"
          >
            I've verified — refresh
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