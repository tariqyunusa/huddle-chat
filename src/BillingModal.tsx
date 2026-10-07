import { useState } from "react";
import { Check, CreditCard, X } from "lucide-react";
import { startSubscription } from "./api";

type Plan = "standard" | "pro";

const PLANS: { id: Plan; name: string; description: string }[] = [
  { id: "standard", name: "Standard", description: "More room for your sessions" },
  { id: "pro", name: "Pro", description: "The highest usage allowance" },
];

const PLAN_RANK: Record<string, number> = { free: 0, standard: 1, pro: 2 };

export default function BillingModal({
  currentPlan,
  onClose,
}: {
  currentPlan: string;
  onClose: () => void;
}) {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choosePlan(plan: Plan) {
    setLoadingPlan(plan);
    setError(null);
    try {
      const checkoutUrl = await startSubscription(plan);
      localStorage.setItem("huddle_pending_plan", plan);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout");
      setLoadingPlan(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-title"
        className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-stone-500">
              <CreditCard size={16} /> Plans and billing
            </p>
            <h2 id="billing-title" className="text-xl font-semibold text-stone-900">
              Choose a plan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close billing"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-5 text-sm text-stone-500">
          Subscriptions are billed in USD by card. Checkout shows the plan price and billing terms before you confirm.
        </p>

        <div className="space-y-3">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isUpgrade = (PLAN_RANK[plan.id] ?? 0) > (PLAN_RANK[currentPlan] ?? 0);
            return (
              <div
                key={plan.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-stone-800">{plan.name}</h3>
                    {isCurrent && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                        Current plan
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{plan.description}</p>
                </div>
                {isCurrent ? (
                  <Check size={18} className="shrink-0 text-emerald-600" />
                ) : (
                  <button
                    type="button"
                    onClick={() => choosePlan(plan.id)}
                    disabled={!isUpgrade || loadingPlan !== null}
                    className="shrink-0 rounded-lg bg-stone-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingPlan === plan.id
                      ? "Opening…"
                      : isUpgrade
                        ? "Choose plan"
                        : "Unavailable"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {currentPlan === "pro" && (
          <p className="mt-4 text-sm text-stone-500">You’re on the highest available plan.</p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-rose-600">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
