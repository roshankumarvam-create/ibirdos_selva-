"use client";

import { useEffect, useMemo, useState } from "react";

type ApprovalQuote = {
  id: string;
  event_id: string;
  line_items: {
    label: string;
    quantity: number;
    unitCost: number;
    total: number;
  }[];
  food_cost: string | number;
  labor_cost: string | number;
  overhead: string | number;
  total: string | number;
  margin: string | number;
  approval_status: string | null;
  approval_requested_at: string | null;
  created_at: string;
};

type ApprovalsApiResponse = {
  success: boolean;
  data?: ApprovalQuote[];
  error?: string;
};

type ApprovalActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatCurrency(value: string | number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getFoodCostPercent(quote: ApprovalQuote): number {
  const total = toNumber(quote.total);
  const foodCost = toNumber(quote.food_cost);

  if (total <= 0) {
    return 0;
  }

  return (foodCost / total) * 100;
}

function getGrossProfit(quote: ApprovalQuote): number {
  return (
    toNumber(quote.total) -
    toNumber(quote.food_cost) -
    toNumber(quote.labor_cost) -
    toNumber(quote.overhead)
  );
}

function getMarginPercent(quote: ApprovalQuote): number {
  const total = toNumber(quote.total);

  if (total <= 0) {
    return 0;
  }

  return (getGrossProfit(quote) / total) * 100;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalQuote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeQuoteId, setActiveQuoteId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const approvalCount = useMemo(() => approvals.length, [approvals]);

  async function loadApprovals(): Promise<void> {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/approvals", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as ApprovalsApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Failed to load approvals");
      }

      setApprovals(result.data ?? []);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load approvals"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprovalAction(
    quote: ApprovalQuote,
    action: "approve" | "reject"
  ): Promise<void> {
    try {
      setActiveQuoteId(quote.id);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId: quote.id,
          eventId: quote.event_id,
          action,
          reason:
            action === "approve"
              ? "Manager approved quote."
              : "Manager rejected quote.",
        }),
      });

      const result = (await response.json()) as ApprovalActionResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Approval action failed");
      }

      setSuccessMessage(result.message ?? "Approval updated.");
      await loadApprovals();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Approval action failed"
      );
    } finally {
      setActiveQuoteId("");
    }
  }

  useEffect(() => {
    void loadApprovals();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Manager Approval
          </p>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                Quote Approvals
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Review catering quotes blocked by food cost or margin rules.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 px-6 py-4 text-white">
              <p className="text-sm text-slate-300">Needs Review</p>
              <p className="mt-1 text-3xl font-bold">{approvalCount}</p>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-red-800">Error</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        {successMessage ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-emerald-800">Success</p>
            <p className="mt-1 text-sm text-emerald-700">{successMessage}</p>
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Loading approvals...</p>
          </section>
        ) : null}

        {!isLoading && approvals.length === 0 ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
            <p className="text-lg font-bold text-emerald-900">
              No approvals pending
            </p>
            <p className="mt-2 text-sm text-emerald-700">
              All quotes are currently clear.
            </p>
          </section>
        ) : null}

        <section className="space-y-4">
          {approvals.map((quote) => {
            const foodCostPercent = getFoodCostPercent(quote);
            const grossProfit = getGrossProfit(quote);
            const marginPercent = getMarginPercent(quote);
            const isActionLoading = activeQuoteId === quote.id;

            return (
              <article
                key={quote.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                        Approval Required
                      </p>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        Food Cost {foodCostPercent.toFixed(2)}%
                      </span>
                    </div>

                    <h2 className="mt-3 text-2xl font-bold text-slate-950">
                      Catering Quote
                    </h2>

                    <div className="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-700">
                          Event ID:
                        </span>{" "}
                        {quote.event_id}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">
                          Quote ID:
                        </span>{" "}
                        {quote.id}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">
                          Requested:
                        </span>{" "}
                        {formatDate(quote.approval_requested_at)}
                      </p>
                      <p>
                        <span className="font-medium text-slate-700">
                          Status:
                        </span>{" "}
                        {quote.approval_status ?? "approval_required"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
                    <p className="text-sm text-slate-300">Quote Total</p>
                    <p className="mt-1 text-3xl font-bold">
                      {formatCurrency(quote.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Food Cost</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">
                      {formatCurrency(quote.food_cost)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {foodCostPercent.toFixed(2)}% of quote
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Labor</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">
                      {formatCurrency(quote.labor_cost)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Gross Profit</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">
                      {formatCurrency(grossProfit)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Margin</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">
                      {marginPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={`/quotes/${quote.event_id}`}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    View Quote
                  </a>

                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => void handleApprovalAction(quote, "approve")}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isActionLoading ? "Working..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    disabled={isActionLoading}
                    onClick={() => void handleApprovalAction(quote, "reject")}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isActionLoading ? "Working..." : "Reject"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}