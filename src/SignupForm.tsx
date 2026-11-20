import { useRef, useState } from "react";
import { signup, login } from "./api";
import { useToast } from "./Toast";
import { AnimatePresence, motion } from "motion/react";
import AuthTransition from "./AuthTransition";
import { Camera, Check, ChevronDown, Eye, EyeOff, UserRound, X } from "lucide-react";

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
  const [roleOpen, setRoleOpen] = useState(false);
  const [activeRoleIndex, setActiveRoleIndex] = useState(0);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile?.avatarUrl ?? null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const roleTrigger = useRef<HTMLButtonElement>(null);
  const roleOptions = useRef<Array<HTMLButtonElement | null>>([]);
  const roles = [
    { value: "founder", label: "Founder", detail: "Building a company or team" },
    { value: "engineer", label: "Engineer", detail: "Designing and building products" },
    { value: "student", label: "Student", detail: "Learning or working on a project" },
    { value: "designer", label: "Designer", detail: "Shaping experiences and ideas" },
    { value: "other", label: "Other", detail: "Something else" },
  ];
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
    "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-left text-base outline-none placeholder:text-stone-400 focus:border-blue-100 focus:ring-1 focus:ring-blue-100 dark:bg-stone-900 dark:focus:border-blue-400 dark:focus:ring-blue-100";

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
              className="h-25 w-25"
            />
          </div>
          {!initialProfile && <nav aria-label="Signup progress" className="fixed bottom-5 right-5 z-10 flex items-center gap-2 sm:bottom-8 sm:right-8">
            {(["email", "password", "name"] as const).map((stepName, index) => {
              const currentIndex = step === "email" ? 0 : step === "password" ? 1 : 2;
              const isCurrent = currentIndex === index;
              const isComplete = currentIndex > index;
              return <span key={stepName} aria-current={isCurrent ? "step" : undefined} aria-label={`Step ${index + 1}${isCurrent ? ", current" : isComplete ? ", complete" : ""}`} className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${isCurrent ? "border-blue-600 bg-blue-600 text-white" : isComplete ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "border-stone-300 text-stone-500 dark:border-stone-700"}`}>{index + 1}</span>;
            })}
          </nav>}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`heading-${step}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            >
              <h1 className="text-center font-lora text-3xl tracking-tight">
                {step === "name" ? "Tell us about you" : step === "password" ? "Secure your account" : "Work better together"}
              </h1>
              {step === "email" && (
                <p className="mt-2 text-center text-stone-500">
                  Bring your team into one shared space to think, plan, and get work done together.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
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
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              className="space-y-4 pt-3"
            >
              {step === "email" && (
                <>
                  <input
                    className={field}
                    type="email"
                    aria-label="Email address"
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
                      aria-label="Create a password"
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
                      aria-label="Confirm password"
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
                    className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-stone-200 text-stone-500 transition hover:ring-4 hover:ring-blue-100 active:scale-[0.97] dark:bg-stone-800"
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
                    aria-label="Full name"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                  />
                  <div className="space-y-2 ">
                    <label id="signup-role-label" className="block text-left text-sm font-medium text-stone-700 dark:text-stone-300">
                      What best describes what you do? <span className="font-normal text-stone-500">Optional</span>
                    </label>
                    <div className="relative">
                      <button
                        ref={roleTrigger}
                        type="button"
                        aria-labelledby="signup-role-label"
                        aria-haspopup="listbox"
                        aria-expanded={roleOpen}
                        aria-controls="signup-role-options"
                        onClick={() => {
                          setActiveRoleIndex(Math.max(0, roles.findIndex(option => option.value === role)));
                          setRoleOpen(open => !open);
                        }}
                        onKeyDown={event => {
                          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                            event.preventDefault();
                            setRoleOpen(true);
                            const index = roles.findIndex(option => option.value === role);
                            setActiveRoleIndex(index >= 0 ? index : 0);
                            requestAnimationFrame(() => roleOptions.current[index >= 0 ? index : 0]?.focus());
                          }
                        }}
                        className={`${field} flex items-center justify-between ${role ? "text-stone-900 dark:text-stone-100" : "text-stone-500"}`}
                      >
                        <span>{roles.find(option => option.value === role)?.label ?? "Choose a role"}</span>
                        <ChevronDown size={18} className={`text-stone-500 transition-transform duration-150 ease-out ${roleOpen ? "rotate-180" : ""}`} />
                      </button>
                      {roleOpen && <div id="signup-role-options" role="listbox" aria-labelledby="signup-role-label" className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-900/10 dark:border-stone-700 dark:bg-stone-900">
                        {roles.map((option, index) => <button
                          key={option.value}
                          ref={element => { roleOptions.current[index] = element; }}
                          type="button"
                          role="option"
                          aria-selected={role === option.value}
                          tabIndex={activeRoleIndex === index ? 0 : -1}
                          onFocus={() => setActiveRoleIndex(index)}
                          onClick={() => { setRole(option.value); setRoleOpen(false); roleTrigger.current?.focus(); }}
                          onKeyDown={event => {
                            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                              event.preventDefault();
                              const next = (index + (event.key === "ArrowDown" ? 1 : roles.length - 1)) % roles.length;
                              setActiveRoleIndex(next);
                              roleOptions.current[next]?.focus();
                            } else if (event.key === "Escape") {
                              event.preventDefault(); setRoleOpen(false); roleTrigger.current?.focus();
                            } else if (event.key === "Tab") setRoleOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors duration-100 ${role === option.value ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "text-stone-800 hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-800"}`}
                        >
                          <span><span className="block text-sm font-medium">{option.label}</span><span className="mt-0.5 block text-xs text-stone-500">{option.detail}</span></span>
                          {role === option.value && <Check size={17} aria-hidden="true" />}
                        </button>)}
                      </div>}
                    </div>
                  </div>
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
