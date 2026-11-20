import { useState } from "react";
import { ArrowLeft, Link2 } from "lucide-react";
import { createSession, createSessionInviteLink, inviteToSession } from "./api";
import { useToast } from "./Toast";

export default function OnboardingInviteScreen({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const showToast = useToast();

  function finish() {
    localStorage.removeItem("huddle_onboarding_invite_pending");
    onDone();
  }

  async function createAndInvite(shareLink: boolean) {
    if (!email.trim() && !shareLink) return;
    setBusy(true);
    try {
      const session = await createSession("Our first Huddle");
      if (email.trim()) await inviteToSession(session.id, { email: email.trim() });
      if (shareLink) {
        const { token } = await createSessionInviteLink(session.id);
        const url = new URL(window.location.pathname, window.location.origin);
        url.searchParams.set("invite", token);
        await navigator.clipboard.writeText(url.toString());
        showToast("success", "Huddle created and invite link copied");
      } else {
        showToast("success", `Huddle created${email.trim() ? ` and invitation sent to ${email.trim()}` : ""}`);
      }
      finish();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Couldn't create your Huddle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white px-4 py-12 text-stone-950 dark:bg-stone-950">
      <button type="button" onClick={finish} className="absolute left-6 top-8 flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-blue-700 dark:text-stone-300"><ArrowLeft size={17}/> Skip setup</button>
      <section className="w-full max-w-md space-y-5 text-center">
        <img src="/huddle-logo.svg" alt="Huddle" className="mx-auto h-20 w-20" />
        <h1 className="font-lora text-3xl tracking-tight">Bring your team together</h1>
        <p className="text-stone-500">Start your first shared space and invite someone to plan, discuss, and work together. You can do this later, too.</p>
        <label htmlFor="onboarding-invite-email" className="block text-left text-sm font-medium text-stone-700 dark:text-stone-300">Teammate’s email</label>
        <input id="onboarding-invite-email" type="email" placeholder="name@example.com" value={email} onChange={event => setEmail(event.target.value)} className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-left outline-none placeholder:text-stone-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:bg-stone-900 dark:focus:border-blue-400 dark:focus:ring-blue-900" />
        <button type="button" disabled={busy || !email.trim()} onClick={() => void createAndInvite(false)} className="auth-button w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50">{busy ? "Creating your Huddle…" : "Create Huddle and send invite"}</button>
        <button type="button" disabled={busy} onClick={() => void createAndInvite(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 py-3 font-semibold text-stone-700 transition hover:bg-stone-50 active:scale-[0.98] disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-900"><Link2 size={17}/> Create Huddle and copy invite link</button>
        <p className="text-xs text-stone-500">Or skip setup and explore Huddle. You can invite people anytime.</p>
      </section>
    </main>
  );
}
