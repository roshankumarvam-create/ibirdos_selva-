"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type QuoteLineItem = {
  label: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type Quote = {
  id: string;
  event_id: string;
  line_items: QuoteLineItem[];
  food_cost: string | number;
  labor_cost: string | number;
  overhead: string | number;
  total: string | number;
  margin: string | number;
  pdf: string | null;
  sent_at: string | null;
  approval_status: string | null;
  approval_requested_at: string | null;
  created_at: string;
};

type QuotesApiResponse = {
  success: boolean;
  data?: Quote[];
  error?: string;
};

type ApprovalApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type SendQuoteApiResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

type QuoteStatus =
  | "Draft"
  | "Sent"
  | "Approval Required"
  | "Approval Requested"
  | "Approved"
  | "Rejected";

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

function formatPercent(value: string | number | null | undefined): string {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not sent yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getQuoteStatus(
  sentAt: string | null,
  foodCostPercent: number,
  approvalStatus: string | null,
  approvalRequested: boolean
): QuoteStatus {
  if (sentAt) {
    return "Sent";
  }

  if (approvalStatus === "approved") {
    return "Approved";
  }

  if (approvalStatus === "rejected") {
    return "Rejected";
  }

  if (
    approvalRequested ||
    approvalStatus === "approval_required" ||
    approvalStatus === "approval_requested"
  ) {
    return "Approval Requested";
  }

  if (foodCostPercent > 32) {
    return "Approval Required";
  }

  return "Draft";
}

function getStatusClass(status: QuoteStatus): string {
  if (status === "Sent") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (status === "Approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "Rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (status === "Approval Requested") {
    return "bg-purple-50 text-purple-700 ring-purple-200";
  }

  if (status === "Approval Required") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export default function QuotePage() {
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRequestingApproval, setIsRequestingApproval] =
    useState<boolean>(false);
  const [isSendingQuote, setIsSendingQuote] = useState<boolean>(false);
  const [approvalRequested, setApprovalRequested] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  async function reloadQuote(): Promise<void> {
    const response = await fetch(`/api/quotes?eventId=${eventId}`, {
      method: "GET",
      cache: "no-store",
    });

    const result = (await response.json()) as QuotesApiResponse;

    if (!response.ok || !result.success) {
      throw new Error(result.error ?? "Failed to reload quote");
    }

    setQuotes(result.data ?? []);

    const firstQuote = result.data?.[0];

    setApprovalRequested(
      firstQuote?.approval_status === "approval_required" ||
        firstQuote?.approval_status === "approval_requested" ||
        Boolean(firstQuote?.approval_requested_at)
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadQuotes(): Promise<void> {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(`/api/quotes?eventId=${eventId}`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as QuotesApiResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "Failed to load quote");
        }

        if (isMounted) {
          setQuotes(result.data ?? []);

          const firstQuote = result.data?.[0];

          setApprovalRequested(
            firstQuote?.approval_status === "approval_required" ||
              firstQuote?.approval_status === "approval_requested" ||
              Boolean(firstQuote?.approval_requested_at)
          );
        }
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load quote"
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadQuotes();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const latestQuote = useMemo<Quote | null>(() => {
    return quotes[0] ?? null;
  }, [quotes]);

  const profitSummary = useMemo(() => {
    const total = toNumber(latestQuote?.total);
    const foodCost = toNumber(latestQuote?.food_cost);
    const laborCost = toNumber(latestQuote?.labor_cost);
    const overhead = toNumber(latestQuote?.overhead);
    const grossProfit = total - foodCost - laborCost - overhead;
    const foodCostPercent = total > 0 ? (foodCost / total) * 100 : 0;
    const laborCostPercent = total > 0 ? (laborCost / total) * 100 : 0;
    const overheadPercent = total > 0 ? (overhead / total) * 100 : 0;
    const marginPercent = total > 0 ? (grossProfit / total) * 100 : 0;
    const approvalNeeded = foodCostPercent > 32 || marginPercent < 25;

    return {
      total,
      foodCost,
      laborCost,
      overhead,
      grossProfit,
      foodCostPercent,
      laborCostPercent,
      overheadPercent,
      marginPercent,
      approvalNeeded,
    };
  }, [latestQuote]);

  const databaseApprovalRequested =
    latestQuote?.approval_status === "approval_required" ||
    latestQuote?.approval_status === "approval_requested" ||
    Boolean(latestQuote?.approval_requested_at);

  const isApproved = latestQuote?.approval_status === "approved";
  const isRejected = latestQuote?.approval_status === "rejected";
  const isSent = Boolean(latestQuote?.sent_at);

  const quoteStatus = getQuoteStatus(
    latestQuote?.sent_at ?? null,
    profitSummary.foodCostPercent,
    latestQuote?.approval_status ?? null,
    approvalRequested || databaseApprovalRequested
  );

  const lineItems = latestQuote?.line_items ?? [];

  function handleBackToEvent(): void {
    router.push(`/events/${eventId}`);
  }

  function handleSaveQuote(): void {
    router.refresh();
  }

  function handleGeneratePdf(): void {
    window.print();
  }

  async function handleSendQuote(): Promise<void> {
    if (!latestQuote) {
      return;
    }

    if (isRejected) {
      setErrorMessage("This quote was rejected and cannot be sent.");
      return;
    }

    if (profitSummary.approvalNeeded && !isApproved) {
      setErrorMessage("This quote needs approval before it can be sent.");
      return;
    }

    if (isSent) {
      setErrorMessage("This quote has already been sent.");
      return;
    }

    try {
      setIsSendingQuote(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/quotes/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId: latestQuote.id,
          eventId,
        }),
      });

      const result = (await response.json()) as SendQuoteApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Send quote failed");
      }

      setSuccessMessage("Quote sent successfully.");
      await reloadQuote();
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Send quote failed"
      );
    } finally {
      setIsSendingQuote(false);
    }
  }

  async function handleRequestApproval(): Promise<void> {
    if (!latestQuote) {
      return;
    }

    try {
      setIsRequestingApproval(true);
      setErrorMessage("");
      setSuccessMessage("");

      const response = await fetch("/api/quotes/request-approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteId: latestQuote.id,
          eventId,
          foodCostPercent: profitSummary.foodCostPercent,
          marginPercent: profitSummary.marginPercent,
          total: profitSummary.total,
          grossProfit: profitSummary.grossProfit,
        }),
      });

      const result = (await response.json()) as ApprovalApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Approval request failed");
      }

      setApprovalRequested(true);
      setSuccessMessage("Approval request created. Alert saved for manager review.");
      await reloadQuote();
      router.refresh();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Approval request failed"
      );
    } finally {
      setIsRequestingApproval(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Loading quote...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage && !latestQuote) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-red-600">Quote error</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              Could not load quote
            </h1>
            <p className="mt-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!latestQuote) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              Quote Builder
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              No quote found
            </h1>
            <p className="mt-3 text-sm text-slate-600">Event ID: {eventId}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                  Quote Builder
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${getStatusClass(
                    quoteStatus
                  )}`}
                >
                  {quoteStatus}
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
                Catering Quote
              </h1>

              <div className="mt-4 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                <p>
                  <span className="font-medium text-slate-700">Event ID:</span>{" "}
                  {eventId}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Quote ID:</span>{" "}
                  {latestQuote.id}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Created:</span>{" "}
                  {formatDate(latestQuote.created_at)}
                </p>
                <p>
                  <span className="font-medium text-slate-700">Sent:</span>{" "}
                  {formatDate(latestQuote.sent_at)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-950 px-6 py-5 text-white">
              <p className="text-sm text-slate-300">Total Quote</p>
              <p className="mt-1 text-3xl font-bold">
                {formatCurrency(latestQuote.total)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBackToEvent}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Back to Event
            </button>

            <button
              type="button"
              onClick={handleSaveQuote}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Save Quote
            </button>

            <button
              type="button"
              onClick={handleGeneratePdf}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Generate PDF
            </button>

            {profitSummary.approvalNeeded && !isApproved ? (
              <button
                type="button"
                onClick={handleRequestApproval}
                disabled={
                  isRequestingApproval ||
                  approvalRequested ||
                  databaseApprovalRequested
                }
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {approvalRequested || databaseApprovalRequested
                  ? "Approval Requested"
                  : isRequestingApproval
                    ? "Requesting..."
                    : "Request Approval"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSendQuote()}
              disabled={
                isSendingQuote ||
                (profitSummary.approvalNeeded && !isApproved) ||
                isRejected ||
                isSent
              }
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSent ? "Sent" : isSendingQuote ? "Sending..." : "Send Quote"}
            </button>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-red-800">Action blocked</p>
            <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
          </section>
        ) : null}

        {successMessage ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-emerald-800">Success</p>
            <p className="mt-1 text-sm text-emerald-700">{successMessage}</p>
          </section>
        ) : null}

        {profitSummary.approvalNeeded && !isApproved ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-amber-800">
              Approval required
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Food cost is {profitSummary.foodCostPercent.toFixed(2)}%. iBirdOS
              target is 32% or lower before quote approval. Send Quote is
              blocked until approval is completed.
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-emerald-800">
              Approval not required
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              This quote is within the current profit rules.
            </p>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Food Cost</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {formatCurrency(latestQuote.food_cost)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {profitSummary.foodCostPercent.toFixed(2)}% of quote
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Labor Cost</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {formatCurrency(latestQuote.labor_cost)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {profitSummary.laborCostPercent.toFixed(2)}% of quote
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Overhead</p>
            <p className="mt-3 text-2xl font-bold text-slate-950">
              {formatCurrency(latestQuote.overhead)}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {profitSummary.overheadPercent.toFixed(2)}% of quote
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">
              Gross Profit
            </p>
            <p className="mt-3 text-2xl font-bold text-emerald-900">
              {formatCurrency(profitSummary.grossProfit)}
            </p>
            <p className="mt-2 text-xs text-emerald-700">
              {formatPercent(profitSummary.marginPercent)} margin
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Event Profit Summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quote → Event Profit → Approval → Send
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                {isSent
                  ? "Sent"
                  : profitSummary.approvalNeeded && !isApproved
                    ? "Needs approval"
                    : "Approved"}
              </div>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-2">
            <div className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">Revenue</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(profitSummary.total)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">Food Cost</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(profitSummary.foodCost)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">Labor</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(profitSummary.laborCost)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Overhead</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(profitSummary.overhead)}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-6 md:border-l md:border-t-0">
              <p className="text-sm font-medium text-slate-500">
                Final Gross Profit
              </p>
              <p className="mt-2 text-4xl font-bold text-slate-950">
                {formatCurrency(profitSummary.grossProfit)}
              </p>

              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Margin</span>
                  <span className="font-semibold text-slate-950">
                    {formatPercent(profitSummary.marginPercent)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Food Cost Rule</span>
                  <span className="font-semibold text-slate-950">
                    Target: 32%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Approval Needed</span>
                  <span
                    className={
                      profitSummary.approvalNeeded && !isApproved
                        ? "font-semibold text-amber-700"
                        : "font-semibold text-emerald-700"
                    }
                  >
                    {profitSummary.approvalNeeded && !isApproved ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Sent Status</span>
                  <span
                    className={
                      isSent
                        ? "font-semibold text-blue-700"
                        : "font-semibold text-slate-700"
                    }
                  >
                    {isSent ? "Sent" : "Not sent yet"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Quote Lines
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Created: {formatDate(latestQuote.created_at)}
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                {lineItems.length} line item{lineItems.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Qty</th>
                  <th className="px-6 py-4 font-semibold">Unit Price</th>
                  <th className="px-6 py-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item: QuoteLineItem, index: number) => (
                  <tr
                    key={`${item.label}-${index}`}
                    className="border-b border-slate-100 text-sm last:border-b-0"
                  >
                    <td className="px-6 py-5 font-medium text-slate-950">
                      {item.label}
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-5 text-slate-600">
                      {formatCurrency(item.unitCost)}
                    </td>
                    <td className="px-6 py-5 text-right font-semibold text-slate-950">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Next To-Do List
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <p>1. Confirm sent_at saves after clicking Send Quote.</p>
            <p>2. Confirm quote page changes to Sent.</p>
            <p>3. Connect real email sending later.</p>
            <p>4. Connect generated PDF later.</p>
            <p>5. Add approval count to dashboard.</p>
            <p>6. Add sent quote count to dashboard.</p>
          </div>
        </section>
      </div>
    </main>
  );
}