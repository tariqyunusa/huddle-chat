import { useEffect, useState } from "react";
import { Check, Crown, Sparkles, X, Zap } from "lucide-react";
import { getPlanPricing, startSubscription, type PlanPricing } from "./api";

type Plan = "standard" | "pro";

const PLANS: {
  id: "free" | Plan;
  name: string;
  description: string;
  price?: string;
  icon: typeof Sparkles;
  features: string[];
}[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with Huddle",
    price: "$0",
    icon: Sparkles,
    features: [
      "Shared reasoning sessions",
      "Live collaboration with your team",
      "15,000 tokens per usage window",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    description: "More room for your sessions",
    price: "See price at checkout",
    icon: Zap,
    features: [
      "Everything in Free",
      "150,000 tokens per usage window",
      "Keep working through longer sessions",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "The highest usage allowance",
    price: "See price at checkout",
    icon: Crown,
    features: [
      "Everything in Standard",
      "400,000 tokens per usage window",
      "Room for your most involved sessions",
    ],
  },
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
  const [pricing, setPricing] = useState<Record<Plan, PlanPricing> | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlanPricing()
      .then((plans) => {
        if (!cancelled) setPricing(plans);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPricingError(
            err instanceof Error ? err.message : "Couldn't load current plan prices",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function formatPrice(plan: Plan) {
    const planPrice = pricing?.[plan];
    if (!planPrice) return null;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: planPrice.currency,
      }).format(Number(planPrice.amount));
    } catch {
      return `${planPrice.currency} ${planPrice.amount}`;
    }
  }

  function formatBillingInterval(plan: Plan) {
    const planPrice = pricing?.[plan];
    if (!planPrice?.interval) return "Recurring billing";
    const unit = planPrice.interval.toLowerCase();
    const count = planPrice.frequency || 1;
    const label = `${count > 1 ? `${count} ` : ""}${unit}${count > 1 ? "s" : ""}`;
    return `billed every ${label}`;
  }

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
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-0 sm:p-4 dark:bg-black/70"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="billing-title"
        className="flex h-full max-h-[min(960px,96vh)] max-w-375 flex-col overflow-hidden border border-stone-200 bg-stone-100 text-stone-900 shadow-2xl dark:border-stone-700 dark:bg-[#f5f5f4] dark:text-stone-900 sm:rounded-2xl"
      >
        <header className="flex h-14 shrink-0 items-center justify-between  px-5">
          <h2 id="billing-title" className="text-base font-semibold">
            Upgrade
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upgrade plans"
            className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-7 sm:px-8 sm:pt-5 lg:px-12">
          <div className="mx-auto max-w-355">
            <div className="mb-8 text-center sm:mb-10">
              <div className="mx-auto mb-5 inline-flex rounded-full  bg-stone-300 p-1  " role="group" aria-label="Choose plan type">
                <button
                  type="button"
                  aria-pressed="true"
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white"
                >
                  Individual
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Team plans are coming soon"
                  className="cursor-not-allowed rounded-full px-5 py-2 text-sm font-medium text-stone-400 dark:text-stone-500"
                >
                  Team 
                </button>
              </div>
              <h3 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-4xl">
                Plans that grow with you
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm text-stone-400 sm:text-base">
                Choose the usage level that fits your sessions. Your plan takes effect after Bachs confirms checkout.
              </p>
            </div>

            <div className="grid items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = currentPlan === plan.id;
                const isUpgrade =
                  (PLAN_RANK[plan.id] ?? 0) > (PLAN_RANK[currentPlan] ?? 0);
                const paidPlanId: Plan | null = plan.id === "free" ? null : plan.id;
                const isPaidPlan = paidPlanId !== null;

                return (
                  <div
                    key={plan.id}
                    className="relative flex h-full flex-col pt-9"
                  >
                    {plan.id === "standard" && (
                      <div className="absolute inset-x-5 top-0 z-10 flex h-9 items-center justify-center gap-2 rounded-t-xl bg-stone-300 text-sm font-semibold text-gray-500 dark:bg-stone-800 dark:text-stone-100">
                        <Zap size={15} fill="currentColor" />
                        Recommended
                      </div>
                    )}
                    <article
                      className={`relative flex min-h-130 flex-1 flex-col overflow-hidden rounded-2xl  bg-white/90  ${plan.id === "standard" ? " dark:bg-white border border-gray-100" : "dark:border dark:bg-black "}`}
                    >
                    <div className="flex-1 p-5 sm:p-6">
                      <div className={`mb-6 flex h-12 w-12 items-center justify-center  ${plan.id === "standard" ? "dark:text-stone-400" : "text-stone-400"}`}>
                        <Icon size={34} strokeWidth={1.35} />
                      </div>
                      <div className="flex min-h-14 items-start justify-between gap-3">
                        <div>
                          <h4 className={`text-3xl font-semibold tracking-tight   ${plan.id === "standard" ? "dark:text-black" : ""}`}>
                            {plan.name}
                          </h4>
                          <p className={`mt-1 text-sm  *:* ${plan.id === "standard" ? "dark:text-stone-500" : "text-stone-400"}`}>
                            {plan.description}
                          </p>
                        </div>
                        
                      </div>

                      <div className="mt-5 flex min-h-13.5 items-center gap-2">
                        <span className={`text-3xl font-semibold tracking-tight   ${plan.id === "standard" ? "dark:text-black" : "text:stone-900"}`}>
                            {plan.id === "free"
                              ? plan.price
                            : formatPrice(paidPlanId!) ?? (pricingError ? "Price unavailable" : "Loading price…")}
                        </span>
                        {isPaidPlan && (
                          <span className={`text-xs leading-4  ${plan.id === "standard" ? "dark:text-stone-500" : "text-stone-400"}`}>
                            {pricing?.[paidPlanId!]?.currency ?? ""}
                            {pricing?.[paidPlanId!]?.interval
                              ? ` / ${pricing[paidPlanId!].interval}`
                              : ""}
                            <br />
                            {formatBillingInterval(paidPlanId!)}
                          </span>
                        )}
                      </div>

                      {isCurrent ? (
                        <button
                          type="button"
                          disabled
                          className={`mt-4 w-full cursor-pointer rounded-full  px-4 py-3 text-sm font-medium text-stone-500  dark:text-stone-200 ${plan.id === "free"? "dark:bg-stone-300" : ""}`}
                        >
                          Current plan
                        </button>
                      ) : isUpgrade ? (
                        <button
                          type="button"
                          onClick={() => choosePlan(plan.id as Plan)}
                          disabled={loadingPlan !== null}
                          className={`mt-4 w-full rounded-full px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-wait ${plan.id === "standard" ? "bg-black text-white hover:brightness-110" : plan.id === "pro" ? "dark:bg-[#ffffff] bg-black dark:text-white text-white" : "bg-gray-100 text-stone-950 hover:bg-gray-200"}`}
                        >
                          {loadingPlan === plan.id
                            ? "Opening checkout…"
                            : `Get ${plan.name} plan`}
                        </button>
                      ) : (
                        <div className="mt-4 flex h-11.5 items-center justify-center rounded-xl border border-stone-700 bg-stone-800/60 text-sm text-stone-400">
                          Included with your plan
                        </div>
                      )}
                    </div>

                    <div className=" px-5 py-5 sm:px-6">
                      
                      <ul className="space-y-2.5">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm leading-5 text-stone-400"
                          >
                            <Check
                              size={16}
                              className="mt-0.5 shrink-0 text-stone-500"
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    </article>
                  </div>
                );
              })}
            </div>

            {error && (
              <p role="alert" className="mx-auto mt-5 max-w-2xl text-center text-sm text-rose-300">
                {error}
              </p>
            )}
            {pricingError && (
              <p role="status" className="mx-auto mt-3 max-w-2xl text-center text-xs text-amber-200">
                {pricingError}. Checkout remains available and will show the amount before payment.
              </p>
            )}
            <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-stone-500">
              Prices and billing intervals sync from the configured Bachs products. Usage limits apply per usage window.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
