"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BillingStatus = {
  success?: boolean;
  plan?: string | null;
  subscription_status?: string | null;
  subscriptionStatus?: string | null;
  stripe_customer_id?: string | null;
  stripeCustomerId?: string | null;
  stripe_subscription_id?: string | null;
  stripeSubscriptionId?: string | null;
  trial_ends_at?: string | null;
  trialEndsAt?: string | null;
  current_period_end?: string | null;
  currentPeriodEnd?: string | null;
  error?: string;
};

type CheckoutResponse = {
  success?: boolean;
  url?: string;
  error?: string;
};

function readStatus(data: BillingStatus): string {
  return (
    data.subscriptionStatus ??
    data.subscription_status ??
    "unknown"
  );
}

function readPlan(data: BillingStatus): string {
  return data.plan ?? "trial";
}

function readSubscriptionId(data: BillingStatus): string {
  return (
    data.stripeSubscriptionId ??
    data.stripe_subscription_id ??
    "Not connected"
  );
}

function readCustomerId(data: BillingStatus): string {
  return (
    data.stripeCustomerId ??
    data.stripe_customer_id ??
    "Not connected"
  );
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function loadBilling(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/billing/status", {
        cache: "no-store",
      });

      const data = (await response.json()) as BillingStatus;

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Failed to load billing status.");
      }

      setBilling(data);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading billing.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function startCheckout(): Promise<void> {
    setCheckoutLoading(true);
    setError("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
      });

      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || data.success === false || !data.url) {
        throw new Error(data.error ?? "Failed to start Stripe checkout.");
      }

      window.location.href = data.url;
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong starting checkout.";

      setError(message);
      setCheckoutLoading(false);
    }
  }

  useEffect(() => {
    void loadBilling();
  }, []);

  const plan = billing ? readPlan(billing) : "loading";
  const status = billing ? readStatus(billing) : "loading";
  const customerId = billing ? readCustomerId(billing) : "loading";
  const subscriptionId = billing ? readSubscriptionId(billing) : "loading";

  return (
    <main className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#a05a2c]">
                Subscription Access
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#002515]">
                Billing
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
                Manage company subscription access for the iBirdOS workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-bold text-[#111827]"
              >
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => void loadBilling()}
                disabled={loading}
                className="rounded-2xl bg-[#1f2937] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#667085]">
              Loading billing status...
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#111827] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#667085]">Plan</p>
            <p className="mt-3 text-3xl font-black capitalize text-[#002515]">
              {plan}
            </p>
          </div>

          <div className="rounded-3xl border border-[#111827] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#667085]">Status</p>
            <p className="mt-3 text-3xl font-black capitalize text-[#002515]">
              {status}
            </p>
          </div>

          <div className="rounded-3xl border border-[#111827] bg-white p-5 shadow-sm md:col-span-2">
            <p className="text-sm font-bold text-[#667085]">Subscription ID</p>
            <p className="mt-3 break-all text-lg font-black text-[#002515]">
              {subscriptionId}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-[#111827]">
            Company Subscription
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#667085]">
                Stripe Customer
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-[#111827]">
                {customerId}
              </p>
            </div>

            <div className="rounded-2xl bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#667085]">
                Access Rule
              </p>
              <p className="mt-2 text-sm font-semibold text-[#111827]">
                Dashboard access is allowed when company subscription is active,
                trialing, or pilot.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={checkoutLoading}
              className="rounded-2xl bg-[#003b26] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkoutLoading ? "Opening Stripe..." : "Start Stripe Checkout"}
            </button>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-[#eadfce] bg-white px-6 py-3 text-sm font-bold text-[#111827]"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}