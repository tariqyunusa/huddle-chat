import { useEffect, useState } from "react";
import { CheckCircle2, Clock3 } from "lucide-react";
import { getMe } from "./api";

type PaymentStatus = "checking" | "confirmed" | "pending" | "unknown" | "cancelled";

const PLAN_NAMES: Record<string, string> = {
  standard: "Standard",
  pro: "Pro",
};

export default function BillingCallbackPage() {
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState<PaymentStatus>("checking");
  const plan = localStorage.getItem("huddle_pending_plan");
  const planName = plan ? PLAN_NAMES[plan] : null;
  const checkoutCancelled = new URLSearchParams(window.location.search).get("cancelled") === "1";

  useEffect(() => {
    if (checkoutCancelled) {
      localStorage.removeItem("huddle_pending_plan");
      setStatus("cancelled");
      return;
    }
    if (!planName) {
      setStatus("unknown");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    setStatus("checking");

    async function checkSubscription() {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.plan === plan) {
          localStorage.setItem("huddle_plan", me.plan);
          localStorage.removeItem("huddle_pending_plan");
          setStatus("confirmed");
          return;
        }
      } catch {
        // The payment webhook may still be updating the account; keep checking.
      }

      if (cancelled) return;
      attempts += 1;
      if (attempts >= 20) {
        setStatus("pending");
        return;
      }
      timer = window.setTimeout(checkSubscription, 3000);
    }

    void checkSubscription();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [plan, planName, retry, checkoutCancelled]);

  const confirmed = status === "confirmed";
  const title =
    status === "checking"
      ? "Confirming your subscription"
      : confirmed
        ? "Your plan is active"
          : status === "pending"
            ? "Payment is still processing"
            : status === "cancelled"
              ? "Checkout was cancelled"
            : "No payment to confirm";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12 text-center">
      <section className="w-full max-w-md">
        {confirmed ? (
          <CheckCircle2 size={36} className="mx-auto mb-4 text-emerald-600" />
        ) : (
          <Clock3 size={36} className="mx-auto mb-4 text-stone-400" />
        )}
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          {status === "checking" && `We’re waiting for confirmation of your ${planName ?? ""} plan.`}
          {confirmed && `${planName} is now active on your account.`}
          {status === "pending" &&
            "Your payment provider has returned you to Huddle, but the account update has not arrived yet. You can check again shortly."}
          {status === "cancelled" && "No subscription change was made. You can return to Huddle and choose a plan whenever you’re ready."}
          {status === "unknown" &&
            "There’s no pending plan change in this browser. Return to Huddle to review your plan."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {status === "pending" && (
            <button
              type="button"
              onClick={() => setRetry((value) => value + 1)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Check again
            </button>
          )}
          <a
            href="/"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900"
          >
            Return to Huddle
          </a>
        </div>
      </section>
    </main>
  );
}
