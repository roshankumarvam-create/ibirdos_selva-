"use client";

import { useState } from "react";

type CheckoutResponse = {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
};

export default function BillingPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function startCheckout(): Promise<void> {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();

      let result: CheckoutResponse;

      try {
        result = JSON.parse(text) as CheckoutResponse;
      } catch {
        setErrorMessage(
          text || "Stripe checkout route returned invalid response."
        );
        return;
      }

      if (!response.ok || !result.success || !result.checkoutUrl) {
        setErrorMessage(result.error ?? "Unable to start Stripe checkout.");
        return;
      }

      window.location.href = result.checkoutUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to Stripe checkout."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#07160D] px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[40px] border border-[#D8B767]/30 bg-[#0B1F12] shadow-[0_30px_120px_rgba(0,0,0,0.45)] lg:grid-cols-[1fr_0.9fr]">
          <div className="relative overflow-hidden bg-[#081A10] p-8 sm:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2B7A38_0%,transparent_32%),radial-gradient(circle_at_bottom_right,#D8B767_0%,transparent_28%)] opacity-40" />

            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.38em] text-[#D8B767]">
                  IBIRDOS BILLING
                </p>

                <h1 className="mt-8 max-w-xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl">
                  Activate your company workspace.
                </h1>

                <p className="mt-6 max-w-xl text-base leading-7 text-[#DDE8D9]">
                  Connect Stripe billing so iBirdOS can protect paid access
                  before Azure AI invoice extraction is turned on.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D8B767]">
                  Access Rule
                </p>
                <p className="mt-3 text-lg font-black">
                  Login → Company → Stripe Subscription → Dashboard Access
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#F7F3EA] p-6 text-[#081A10] sm:p-8 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D8B767] bg-[#081A10] text-xl font-black text-[#D8B767]">
                  iB
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.28em] text-[#8B6F2E]">
                  Core Restaurant Plan
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-tight">
                  $349/month
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#647064]">
                  Start the Core Restaurant plan for a single-location
                  restaurant or catering operator.
                </p>
              </div>

              <div className="rounded-[32px] border border-[#D7C7A3] bg-white p-6 shadow-[0_22px_70px_rgba(8,26,16,0.12)]">
                <div className="space-y-4">
                  <PlanFeature text="Company subscription access control" />
                  <PlanFeature text="Quote approval dashboard" />
                  <PlanFeature text="Database-backed cost alerts" />
                  <PlanFeature text="Invoice → Ingredient → PriceHistory → Alert engine" />
                  <PlanFeature text="Ready for Azure AI invoice extraction next" />
                </div>

                {errorMessage.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#E7B8A7] bg-[#FFF3EC] px-4 py-3 text-sm font-bold text-[#A23416]">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={startCheckout}
                  disabled={isLoading}
                  className="mt-6 w-full rounded-2xl bg-[#081A10] px-5 py-3 text-sm font-black text-white shadow-[0_16px_40px_rgba(8,26,16,0.24)] transition hover:bg-[#123C1E] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Opening Stripe..." : "Start Core Restaurant Plan"}
                </button>

                <a
                  href="/dashboard"
                  className="mt-4 flex w-full justify-center rounded-2xl border border-[#081A10] px-5 py-3 text-sm font-black text-[#081A10] transition hover:bg-[#081A10] hover:text-white"
                >
                  Back to dashboard
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#081A10] text-xs font-black text-[#D8B767]">
        ✓
      </div>
      <p className="text-sm font-semibold leading-6 text-[#4F5E52]">{text}</p>
    </div>
  );
}