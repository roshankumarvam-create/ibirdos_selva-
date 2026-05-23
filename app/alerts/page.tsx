"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface AlertRecord {
  id: string;
  title: string | null;
  message: string | null;
  type?: string | null;
  alert_type?: string | null;
  severity: string | null;
  status: string | null;
  ingredientName?: string | null;
  oldCost?: number | null;
  newCost?: number | null;
  changePercent?: number | null;
  createdAt?: string | null;
  created_at?: string | null;
}

interface AlertsResponse {
  success: boolean;
  alerts?: AlertRecord[];
  error?: string;
}

function getSafeText(value: string | null | undefined, fallback: string): string {
  if (!value || value.trim().length === 0) {
    return fallback;
  }

  return value;
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0.00%";
  }

  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "$0.00";
  }

  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    async function loadAlerts(): Promise<void> {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/alerts", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as AlertsResponse;

        if (!response.ok || !data.success) {
          setAlerts([]);
          setErrorMessage(data.error ?? "Failed to load alerts.");
          return;
        }

        setAlerts(data.alerts ?? []);
      } catch {
        setAlerts([]);
        setErrorMessage("Failed to connect to alerts API.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadAlerts();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f0e6] px-6 py-8 text-[#172033]">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[32px] border border-[#dfd1bd] bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8b6f47]">
                Invoice Intelligence
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#002515]">
                Cost Alerts
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
                Track ingredient price changes, vendor cost movement, and food
                cost warnings that affect event profit.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-2xl border border-[#002515] bg-[#002515] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        {errorMessage.length > 0 && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
                Ingredient → PriceHistory → Alert
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#172033]">
                Open Cost Alerts
              </h2>
            </div>

            <p className="text-sm font-bold text-[#667085]">
              {isLoading ? "Loading..." : `${alerts.length} alerts`}
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              <div className="rounded-3xl border border-[#dfd1bd] bg-white p-6">
                <p className="text-sm font-bold text-[#667085]">
                  Loading cost alerts...
                </p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-3xl border border-[#dfd1bd] bg-white p-6">
                <p className="text-lg font-black text-[#002515]">
                  No cost alerts right now
                </p>
                <p className="mt-2 text-sm leading-6 text-[#667085]">
                  New ingredient price changes will appear here after recipe
                  imports or supplier invoice updates.
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-3xl border border-[#e2b36f] bg-[#fff7e8] p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-[#002515]">
                        {getSafeText(alert.title, "Ingredient cost alert")}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-[#667085]">
                        {getSafeText(
                          alert.message,
                          "Review ingredient cost change.",
                        )}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-[#9a5b00] shadow-sm">
                      {getSafeText(alert.severity, "medium")}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold uppercase text-[#8b6f47]">
                        Old Cost
                      </p>
                      <p className="mt-2 text-xl font-black text-[#172033]">
                        {formatCurrency(alert.oldCost)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold uppercase text-[#8b6f47]">
                        New Cost
                      </p>
                      <p className="mt-2 text-xl font-black text-[#172033]">
                        {formatCurrency(alert.newCost)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs font-bold uppercase text-[#8b6f47]">
                        Change
                      </p>
                      <p className="mt-2 text-xl font-black text-[#172033]">
                        {formatPercent(alert.changePercent)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-black uppercase tracking-wide text-[#8b6f47]">
                      Status: {getSafeText(alert.status, "open")}
                    </p>

                    <Link
                      href="/dashboard"
                      className="rounded-xl border border-[#9a5b00] bg-white px-4 py-2 text-sm font-bold text-[#172033] transition hover:bg-[#002515] hover:text-white"
                    >
                      Review dashboard impact
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}