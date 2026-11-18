import { useRef, useState } from "react";
import { signup, login } from "./api";
import { useToast } from "./Toast";
import { AnimatePresence, motion } from "motion/react";
import AuthTransition from "./AuthTransition";
import { Camera, Eye, EyeOff, UserRound, X } from "lucide-react";

type Step = "email" | "password" | "name";

export default function SignupForm({
  onSignedUp,
  onSwitchToLogin,
  initialProfile,
}: {
  onSignedUp: (userId: string) => void;
  onSwitchToLogin: () => void;
  initialProfile?: { name: string; avatarUrl?: string };
}) {
  const [step, setStep] = useState<Step>(initialProfile ? "name" : "email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile?.avatarUrl ?? null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const showToast = useToast();

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setStep(step === "email" ? "password" : "name");
  }

  function handleBack() {
    if (initialProfile) {
      onSwitchToLogin();
      return;
    }
    setStep(step === "name" ? "password" : "email");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initialProfile && password !== confirmPassword) {
      showToast("error", "Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      let userId: string;
      if (initialProfile) {
        userId = localStorage.getItem("huddle_user_id")!;
        localStorage.setItem("huddle_display_name", name.trim());
        localStorage.removeItem("huddle_google_profile_pending");
      } else {
        await signup(email, name, password);
        const result = await login(email, password);
        localStorage.setItem("huddle_token", result.access_token);
        localStorage.setItem("huddle_refresh_token", result.refresh_token);
        localStorage.setItem("huddle_user_id", result.user_id);
        localStorage.setItem("huddle_display_name", result.display_name);
        localStorage.setItem("huddle_email_verified", String(result.email_verified));
        userId = result.user_id;
      }
      localStorage.setItem("huddle_onboarding_invite_pending", "true");
      onSignedUp(userId);
    } catch (err) {
      showToast(
        "error",
        err instanceof Error ? err.message : "Signup failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-2xl border border-stone-300 bg-white px-3 py-3 text-center text-base outline-none transition focus:border-blue-100 focus:ring-1 focus:ring-blue-50 placeholder:text-stone-400 dark:bg-stone-900";

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("error", "Choose an image file to use as your profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("error", "Profile photos must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setAvatarUrl(URL.createObjectURL(file));
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12 text-stone-950 dark:bg-stone-950">
      {step !== "email" && (
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-6 top-8 text-sm font-semibold hover:text-blue-600"
        >
          ‹&nbsp; Go back
        </button>
      )}
      <AuthTransition>
        <form
          onSubmit={step === "name" ? handleSubmit : handleNext}
          className="w-full max-w-md space-y-5"
        >
          <div
            className=" flex  flex-col items-center justify-center gap-1"
            aria-label="Huddle"
          >
            <img
              src="/huddle-logo.svg"
              alt=""
              className="h-[100px] w-[100px]"
            />
          </div>
          <h1 className="text-center font-lora text-3xl tracking-tight">
            {step === "name" ? "Tell us about you" : "Welcome to Huddle"}
          </h1>
          {step === "email" && (
            <p className="text-center text-stone-500">
              AI that works in the room, not alone.
            </p>
          )}
          {step === "email" && (
            <>
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
              <div className="flex items-center gap-4 text-xs text-stone-400">
                <span className="h-px flex-1 bg-stone-200" />
                Or
                <span className="h-px flex-1 bg-stone-200" />
              </div>
            </>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 pt-3"
            >
              {step === "email" && (
                <>
                  <input
                    className={field}
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                </>
              )}
              {step === "password" && (
                <>
                  <div className="relative">
                    <input
                      className={field}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password (8+ characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-stone-500"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      className={field}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-4 text-stone-500"
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </>
              )}
              {step === "name" && (
                <>
                  <div className="flex justify-center">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => avatarInput.current?.click()}
                        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-stone-500 transition hover:ring-4 hover:ring-blue-100 dark:bg-stone-800"
                        aria-label={
                          avatarUrl
                            ? "Change profile photo"
                            : "Add profile photo"
                        }
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Profile photo preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserRound size={30} strokeWidth={1.6} />
                        )}
                      </button>
                      <input
                        ref={avatarInput}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarChange}
                        aria-label="Choose a profile photo"
                      />
                      {avatarUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(avatarUrl);
                            setAvatarUrl(null);
                            if (avatarInput.current)
                              avatarInput.current.value = "";
                          }}
                          className="absolute -right-1 -top-1 rounded-full bg-white p-1.5 text-stone-600 shadow dark:bg-stone-700 dark:text-stone-100"
                          aria-label="Remove profile photo"
                        >
                          <X size={14} />
                        </button>
                      ) : (
                        <span className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-1.5 text-white">
                          <Camera size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    className={field}
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                  <label
                    htmlFor="signup-role"
                    className="block text-center text-base text-stone-700 dark:text-stone-300"
                  >
                    What best describes what you do?
                  </label>
                  <select
                    id="signup-role"
                    className={`${field} text-stone-700 dark:text-stone-300`}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select your role
                    </option>
                    <option value="founder">Founder</option>
                    <option value="engineer">Engineer</option>
                    <option value="student">Student</option>
                    <option value="designer">Designer</option>
                    <option value="other">Other</option>
                  </select>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <button
            type="submit"
            disabled={loading}
            className="auth-button w-full rounded-2xl bg-blue-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Creating your account…"
              : step === "name"
                ? "Create account"
                : "Continue"}
          </button>
          <p className="text-center text-sm text-stone-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-medium text-blue-700 underline underline-offset-2"
            >
              Log in
            </button>
          </p>
          <p className="text-center text-xs text-stone-500">
            By continuing, you agree to Huddle’s Terms &amp; Privacy.
          </p>
        </form>
      </AuthTransition>
    </main>
  );
}
