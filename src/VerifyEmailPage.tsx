import { useEffect, useState } from "react";
import { verifyEmail } from "./api";

export default function VerifyEmailPage({ token, onDone }: { token: string; onDone: () => void }) {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    verifyEmail(token)
      .then(() => {
        localStorage.setItem("huddle_email_verified", "true");
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Something went wrong.");
      });
  }, [token]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center max-w-sm px-6">
        {status === "loading" && <p className="text-stone-500">Verifying your email…</p>}
        {status === "success" && (
          <>
            <h1 className="text-lg font-semibold text-stone-800 mb-2">Email verified</h1>
            <p className="text-sm text-stone-500 mb-4">Your email has been confirmed.</p>
            <button
              onClick={onDone}
              className="bg-stone-800 text-white rounded-xl px-4 py-2 text-sm font-medium"
            >
              Continue to Huddle
            </button>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold text-stone-800 mb-2">Verification failed</h1>
            <p className="text-sm text-stone-500">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}