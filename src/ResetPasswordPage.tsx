import { useState } from "react";
import { resetPassword } from "./api";
import { useToast } from "./Toast";

export default function ResetPasswordPage({
  token,
  onDone,
}: {
  token: string;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      showToast("error", "Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      showToast("success", "Password updated. You can now log in.");
      onDone();
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Invalid or expired link.",
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
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm space-y-4 px-6"
        >
          <h1 className="text-xl font-semibold tracking-tight text-center mb-2">
            Set a new password
          </h1>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
            minLength={8}
            className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full bg-stone-100 rounded-xl px-4 py-2 text-sm outline-none focus:border-stone-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-200 text-stone-900 cursor-pointer rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
