"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface QuoteStats {
  totalQuotes: number;
  approvalRequiredQuotes: number;
  approvedReadyToSendQuotes: number;
  sentQuotes: number;
  draftQuotes: number;
}

interface QuoteStatsResponse {
  success: boolean;
  totalQuotes?: number;
  approvalRequiredQuotes?: number;
  approvedReadyToSendQuotes?: number;
  sentQuotes?: number;
  draftQuotes?: number;
  data?: Partial<QuoteStats>;
}

interface AlertRecord {
  id: string;
  title: string | null;
  message: string | null;
  severity: string | null;
  status: string | null;
}

interface AlertsResponse {
  success: boolean;
  alerts?: AlertRecord[];
}

interface DashboardEventProfit {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  status: string;
  revenue: number;
  foodCost: number;
  margin: number;
  menuItems: number;
  openPrepItems: number;
}

interface EventProfitResponse {
  success: boolean;
  totalRevenue: number;
  totalFoodCost: number;
  averageMargin: number;
  lowMarginEvents: number;
  eventsNeedingPrep: number;
  eventsReadyForKitchenPacket: number;
  eventCount: number;
  latestEvents: DashboardEventProfit[];
}

interface SalesSummary {
  salesToday: number;
  posVariance: number;
  laborCost: number;
  rentCost: number;
  foodCost: number;
  lcVsSalesPercent: number;
  rentVsSalesPercent: number;
  salesVsFoodCostPercent: number;
  thirdPartyRevenue: number;
  barRevenue: number;
  salesEntryCount: number;
}

interface SalesApiResponse {
  success: boolean;
  companyId?: string;
  summary?: SalesSummary;
  error?: string;
}

const emptyStats: QuoteStats = {
  totalQuotes: 0,
  approvalRequiredQuotes: 0,
  approvedReadyToSendQuotes: 0,
  sentQuotes: 0,
  draftQuotes: 0,
};

const emptyEventProfit: EventProfitResponse = {
  success: true,
  totalRevenue: 0,
  totalFoodCost: 0,
  averageMargin: 0,
  lowMarginEvents: 0,
  eventsNeedingPrep: 0,
  eventsReadyForKitchenPacket: 0,
  eventCount: 0,
  latestEvents: [],
};

const emptySalesSummary: SalesSummary = {
  salesToday: 0,
  posVariance: 0,
  laborCost: 0,
  rentCost: 0,
  foodCost: 0,
  lcVsSalesPercent: 0,
  rentVsSalesPercent: 0,
  salesVsFoodCostPercent: 0,
  thirdPartyRevenue: 0,
  barRevenue: 0,
  salesEntryCount: 0,
};

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getVarianceLabel(value: number): string {
  if (value === 0) {
    return "Balanced";
  }

  if (value > 0) {
    return "Over";
  }

  return "Short";
}

function getAlertCardClass(severity: string | null): string {
  const normalizedSeverity = (severity ?? "").toLowerCase();

  if (normalizedSeverity === "high" || normalizedSeverity === "critical") {
    return "border-[#ffb4b4] bg-[#fff3f3]";
  }

  if (normalizedSeverity === "medium" || normalizedSeverity === "warning") {
    return "border-[#e2b36f] bg-[#fff7e8]";
  }

  return "border-[#d7c49e] bg-white";
}

export default function DashboardPage() {
  const [stats, setStats] = useState<QuoteStats>(emptyStats);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [eventProfit, setEventProfit] =
    useState<EventProfitResponse>(emptyEventProfit);
  const [salesSummary, setSalesSummary] =
    useState<SalesSummary>(emptySalesSummary);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard(): Promise<void> {
      try {
        const [
          quoteResponse,
          alertResponse,
          eventProfitResponse,
          salesResponse,
        ] = await Promise.all([
          fetch("/api/dashboard/quote-stats", { cache: "no-store" }),
          fetch("/api/alerts", { cache: "no-store" }),
          fetch("/api/dashboard/event-profit", { cache: "no-store" }),
          fetch("/api/sales", { cache: "no-store" }),
        ]);

        const quoteData = (await quoteResponse.json()) as QuoteStatsResponse;
        const alertData = (await alertResponse.json()) as AlertsResponse;
        const eventProfitData =
          (await eventProfitResponse.json()) as EventProfitResponse;
        const salesData = (await salesResponse.json()) as SalesApiResponse;

        if (!isMounted) {
          return;
        }

        const quoteSource = quoteData.data ?? quoteData;

        setStats({
          totalQuotes: quoteSource.totalQuotes ?? 0,
          approvalRequiredQuotes: quoteSource.approvalRequiredQuotes ?? 0,
          approvedReadyToSendQuotes:
            quoteSource.approvedReadyToSendQuotes ?? 0,
          sentQuotes: quoteSource.sentQuotes ?? 0,
          draftQuotes: quoteSource.draftQuotes ?? 0,
        });

        setAlerts(Array.isArray(alertData.alerts) ? alertData.alerts : []);
        setEventProfit(
          eventProfitData.success ? eventProfitData : emptyEventProfit,
        );
        setSalesSummary(
          salesData.success && salesData.summary
            ? salesData.summary
            : emptySalesSummary,
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setStats(emptyStats);
        setAlerts([]);
        setEventProfit(emptyEventProfit);
        setSalesSummary(emptySalesSummary);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const mainDemoEvent = eventProfit.latestEvents[0];

  return (
    <main className="min-h-screen bg-[#f6f0e6] px-4 py-6 text-[#172033] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-[#dfd1bd] bg-white shadow-lg">
          <div className="rounded-t-[32px] bg-[#002515] px-8 py-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d7bd8f]">
              IBIRDOS
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 px-8 pt-6">
            <Link
              href="/dashboard"
              className="rounded-2xl bg-[#002515] px-4 py-3 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/invoices"
              className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
            >
              Invoices
            </Link>

            <Link
              href="/events"
              className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
            >
              Events
            </Link>

            <Link
              href="/recipes"
              className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
            >
              Recipes
            </Link>

            <Link
              href="/kitchen"
              className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-semibold text-[#111827]"
            >
              Kitchen
            </Link>

            <button
              suppressHydrationWarning
              type="button"
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                });

                window.location.href = "/login";
              }}
              className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-semibold text-white"
            >
              Logout
            </button>
          </div>

          <div className="grid gap-8 p-8 lg:grid-cols-[1.4fr_0.6fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#006b3f]">
                Executive Command Center
              </p>
              <h1 className="mt-4 text-5xl font-black text-[#002515]">
                Control kitchen cost.
                <br />
                Protect event profit.
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-6 text-[#667085]">
                Invoice → Ingredient → Recipe → Event → Profit → Alert
              </p>
            </div>

            <div className="rounded-[26px] bg-[#002515] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d7bd8f]">
                Live Engine
              </p>
              <h2 className="mt-4 text-2xl font-black">
                Invoice cost intelligence is live
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#d8efe5]">
                Dashboard is reading real alerts from /api/alerts and sales
                data from /api/sales.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
            Owner / Manager Command
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="mt-1 text-2xl font-black">
                Daily Business Command Center
              </h2>
              <p className="mt-2 text-sm text-[#667085]">
                Sales, labor, rent, food cost, bar revenue, 3rd-party revenue,
                bookings, and daily closeout control.
              </p>
            </div>

            <Link
              href="/sales"
              className="rounded-2xl bg-[#005445] px-5 py-3 text-center text-sm font-black text-white"
            >
              Open Daily Sales Entry
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/sales"
              className="rounded-3xl border border-[#005445] bg-[#eafff8] p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Daily Sales Entry</p>
              <p className="mt-4 text-2xl font-black text-[#002515]">
                Enter Today
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#006b3f]">
                POS closeout
              </p>
            </Link>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Sales Today</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading ? "..." : formatCurrency(salesSummary.salesToday)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Entries: {isLoading ? "..." : salesSummary.salesEntryCount}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">POS Variance</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading ? "..." : formatCurrency(salesSummary.posVariance)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                {isLoading ? "Checking" : getVarianceLabel(salesSummary.posVariance)}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">3rd Party Revenue</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading
                  ? "..."
                  : formatCurrency(salesSummary.thirdPartyRevenue)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Delivery platforms
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Sales vs Food Cost</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading
                  ? "..."
                  : formatPercent(salesSummary.salesVsFoodCostPercent)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Target 28% - 32%
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">LC vs Sales</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading
                  ? "..."
                  : formatPercent(salesSummary.lcVsSalesPercent)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Labor cost control
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Rent vs Sales</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading
                  ? "..."
                  : formatPercent(salesSummary.rentVsSalesPercent)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Fixed cost view
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Bar Revenue</p>
              <p className="mt-5 text-4xl font-black text-[#002515]">
                {isLoading ? "..." : formatCurrency(salesSummary.barRevenue)}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Beverage sales
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Link
              href="/events"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Booking Table</p>
              <p className="mt-5 text-5xl font-black text-[#002515]">
                {isLoading ? "..." : eventProfit.eventCount}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Catering / events
              </p>
            </Link>

            <Link
              href="/events"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Food Tasting</p>
              <p className="mt-5 text-5xl font-black text-[#002515]">0</p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Pipeline placeholder
              </p>
            </Link>

            <Link
              href="/invoices"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Invoices Needing Review</p>
              <p className="mt-5 text-5xl font-black text-[#002515]">
                {alerts.length}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6f47]">
                Cost review queue
              </p>
            </Link>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
            Quote Control
          </p>
          <h2 className="mt-1 text-2xl font-black">Quote Command Center</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-5">
            {[
              {
                title: "Approval Required",
                value: stats.approvalRequiredQuotes,
                href: "/quotes",
              },
              {
                title: "Ready to Send",
                value: stats.approvedReadyToSendQuotes,
                href: "/quotes",
              },
              {
                title: "Sent Quotes",
                value: stats.sentQuotes,
                href: "/quotes",
              },
              {
                title: "Draft Quotes",
                value: stats.draftQuotes,
                href: "/quotes",
              },
              {
                title: "Total Quotes",
                value: stats.totalQuotes,
                href: "/quotes",
              },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <p className="text-sm font-bold">{card.title}</p>
                <p className="mt-5 text-5xl font-black text-[#002515]">
                  {isLoading ? "..." : card.value}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
                Invoice Intelligence
              </p>
              <h2 className="mt-1 text-2xl font-black">Cost Alerts</h2>
              <p className="mt-2 text-sm text-[#667085]">
                Supplier invoice price changes that need operator review.
              </p>
            </div>

            <Link
              href="/invoices"
              className="rounded-2xl bg-[#002515] px-5 py-3 text-center text-sm font-black text-white"
            >
              Open Invoices
            </Link>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {alerts.length === 0 ? (
              <div className="rounded-3xl border bg-white p-5">
                <p className="font-bold">No cost alerts right now</p>
                <p className="mt-2 text-sm text-[#667085]">
                  Ingredient price changes will appear here after confirming
                  supplier invoices.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-3xl border p-5 ${getAlertCardClass(
                    alert.severity,
                  )}`}
                >
                  <p className="font-bold">
                    {alert.title ?? "Ingredient cost alert"}
                  </p>
                  <p className="mt-2 text-sm text-[#667085]">
                    {alert.message ?? "Review ingredient cost change."}
                  </p>
                  <p className="mt-4 text-xs font-bold uppercase text-[#8b6f47]">
                    Status: {alert.status ?? "new"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
            Profit Engine
          </p>
          <h2 className="mt-1 text-2xl font-black">Event Profit</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Event Revenue</p>
              <p className="mt-5 text-4xl font-black">
                {isLoading
                  ? "..."
                  : formatCurrency(eventProfit.totalRevenue)}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Event Food Cost</p>
              <p className="mt-5 text-4xl font-black">
                {isLoading
                  ? "..."
                  : formatCurrency(eventProfit.totalFoodCost)}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Average Margin</p>
              <p className="mt-5 text-4xl font-black">
                {isLoading
                  ? "..."
                  : formatPercent(eventProfit.averageMargin)}
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5">
              <p className="text-sm font-bold">Low Margin Events</p>
              <p className="mt-5 text-4xl font-black">
                {isLoading ? "..." : eventProfit.lowMarginEvents}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
            Daily Operations
          </p>
          <h2 className="mt-1 text-2xl font-black">Event Action Board</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Link
              href="/events"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Events Needing Prep</p>
              <p className="mt-5 text-5xl font-black">
                {isLoading ? "..." : eventProfit.eventsNeedingPrep}
              </p>
            </Link>

            <Link
              href={
                mainDemoEvent
                  ? `/events/${mainDemoEvent.eventId}/kitchen-packet`
                  : "/kitchen"
              }
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Kitchen Packets Ready</p>
              <p className="mt-5 text-5xl font-black">
                {isLoading ? "..." : eventProfit.eventsReadyForKitchenPacket}
              </p>
            </Link>

            <Link
              href="/invoices"
              className="rounded-3xl border bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold">Open Cost Alerts</p>
              <p className="mt-5 text-5xl font-black">
                {isLoading ? "..." : alerts.length}
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}