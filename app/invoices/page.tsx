"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type InvoiceRow = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paidAt: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  updatedAt: string;
};

type InvoiceStats = {
  totalInvoices: number;
  totalSpend: number;
  needsReview: number;
  confirmed: number;
};

type InvoiceListResponse = {
  success: boolean;
  invoices: InvoiceRow[];
  stats: InvoiceStats;
  error?: string;
};

type VendorConnection = {
  name: string;
  description: string;
};

const vendorConnections: VendorConnection[] = [
  {
    name: "Sysco",
    description: "Request future invoice feed, email import, API, or EDI setup.",
  },
  {
    name: "US Foods",
    description: "Request vendor invoice connection for purchasing data.",
  },
  {
    name: "Vesta",
    description: "Request future vendor invoice and catalog connection.",
  },
  {
    name: "Allen Brothers",
    description: "Request premium protein invoice import support.",
  },
  {
    name: "Restaurant Depot",
    description: "Request invoice import workflow for warehouse purchases.",
  },
  {
    name: "Gordon Food Service",
    description: "Request supplier invoice connection for foodservice purchasing.",
  },
];

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(value: string): string {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getStatusLabel(status: string): string {
  if (!status) {
    return "Review";
  }

  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusClass(status: string): string {
  const cleanStatus = status?.toLowerCase() ?? "review";

  if (cleanStatus === "confirmed" || cleanStatus === "posted" || cleanStatus === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    cleanStatus === "needs_review" ||
    cleanStatus === "review" ||
    cleanStatus === "unpaid"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function InvoicesPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/invoices", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as InvoiceListResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load invoices.");
      }

      setInvoices(data.invoices ?? []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unable to load invoices.";
      setErrorMessage(message);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;

    const totalSpend = invoices.reduce((sum, invoice) => {
      return sum + Number(invoice.totalAmount ?? 0);
    }, 0);

    const reviewCount = invoices.filter((invoice) => {
      const status = invoice.status?.toLowerCase() ?? "review";
      return status === "review" || status === "needs_review";
    }).length;

    const confirmedCount = invoices.filter((invoice) => {
      const status = invoice.status?.toLowerCase() ?? "";
      return status === "confirmed" || status === "posted";
    }).length;

    return {
      totalInvoices,
      totalSpend,
      reviewCount,
      confirmedCount,
    };
  }, [invoices]);

  return (
    <main className="min-h-screen bg-[#f5f0e4] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="rounded-[28px] border border-[#d7c49e] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.45em] text-[#9a5f13]">
                Invoice Command Center
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-[#001f1a] sm:text-5xl">
                Supplier Invoices
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">
                Upload invoices now. Connect vendors later. iBirdOS turns supplier
                invoice changes into ingredient cost updates, price history, alerts,
                and recipe cost recalculation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/invoices/upload"
                className="rounded-full bg-[#004c3f] px-5 py-3 text-sm font-black text-white hover:bg-[#00382f]"
              >
                Upload Invoice
              </Link>

              <button
                type="button"
                onClick={() => {
                  void fetch("/api/invoices", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      vendorName: "Manual Vendor",
                      invoiceNumber: `MANUAL-${Date.now()}`,
                      invoiceDate: new Date().toISOString(),
                      totalAmount: 0,
                      status: "needs_review",
                    }),
                  })
                    .then((response) => response.json() as Promise<{ invoice?: InvoiceRow }>)
                    .then((data) => {
                      if (data.invoice?.id) {
                        router.push(`/invoices/${data.invoice.id}`);
                      } else {
                        void loadInvoices();
                      }
                    });
                }}
                className="rounded-full border border-[#004c3f] bg-white px-5 py-3 text-sm font-black text-[#004c3f] hover:bg-[#f8faf7]"
              >
                Manual Invoice
              </button>

              <Link
                href="/dashboard"
                className="rounded-full border border-[#d7c49e] bg-white px-5 py-3 text-sm font-black text-[#004c3f] hover:bg-[#f8faf7]"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-[22px] border border-[#d7c49e] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Total Invoices
            </p>
            <p className="mt-3 text-3xl font-black text-[#001f1a]">
              {stats.totalInvoices}
            </p>
          </div>

          <div className="rounded-[22px] border border-[#d7c49e] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Total Spend
            </p>
            <p className="mt-3 text-3xl font-black text-[#001f1a]">
              {formatMoney(stats.totalSpend)}
            </p>
          </div>

          <div className="rounded-[22px] border border-[#d7c49e] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Needs Review
            </p>
            <p className="mt-3 text-3xl font-black text-[#001f1a]">
              {stats.reviewCount}
            </p>
          </div>

          <div className="rounded-[22px] border border-[#d7c49e] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
              Confirmed
            </p>
            <p className="mt-3 text-3xl font-black text-[#001f1a]">
              {stats.confirmedCount}
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-[28px] border border-[#d7c49e] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.45em] text-[#9a5f13]">
                Invoice List
              </p>
              <h2 className="mt-3 text-2xl font-black text-[#001f1a]">
                Recent Supplier Invoices
              </h2>
            </div>

            <Link
              href="/invoices/upload"
              className="rounded-full bg-[#004c3f] px-5 py-3 text-sm font-black text-white hover:bg-[#00382f]"
            >
              Upload New Invoice
            </Link>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  <th className="px-4 py-2">Vendor</th>
                  <th className="px-4 py-2">Invoice #</th>
                  <th className="px-4 py-2">Invoice Date</th>
                  <th className="px-4 py-2">Total</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Payment</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="rounded-2xl border border-slate-200 bg-[#fffdfa] px-5 py-8 text-center text-sm font-bold text-slate-600"
                    >
                      Loading invoices...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && invoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="rounded-2xl border border-slate-200 bg-[#fffdfa] px-5 py-8 text-center text-sm font-bold text-slate-600"
                    >
                      No invoices yet. Upload your first supplier invoice to update
                      ingredient costs, create price history, and trigger cost alerts.
                    </td>
                  </tr>
                ) : null}

                {!isLoading
                  ? invoices.map((invoice) => {
                      return (
                        <tr
                          key={invoice.id}
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              router.push(`/invoices/${invoice.id}`);
                            }
                          }}
                          tabIndex={0}
                          className="cursor-pointer rounded-3xl bg-[#fffdf8] text-sm font-bold transition hover:bg-[#fff7df] focus:outline-none focus:ring-2 focus:ring-[#004c3f]"
                        >
                          <td className="rounded-l-2xl border-y border-l border-[#e2e8f0] px-4 py-4 text-[#001f1a]">
                            {invoice.vendorName || "Unknown Vendor"}
                          </td>

                          <td className="border-y border-[#e2e8f0] px-4 py-4">
                            {invoice.invoiceNumber || "-"}
                          </td>

                          <td className="border-y border-[#e2e8f0] px-4 py-4">
                            {formatDate(invoice.invoiceDate)}
                          </td>

                          <td className="border-y border-[#e2e8f0] px-4 py-4">
                            {formatMoney(invoice.totalAmount)}
                          </td>

                          <td className="border-y border-[#e2e8f0] px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-2 text-xs font-black ${getStatusClass(
                                invoice.status,
                              )}`}
                            >
                              {getStatusLabel(invoice.status)}
                            </span>
                          </td>

                          <td className="border-y border-[#e2e8f0] px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-2 text-xs font-black ${getStatusClass(
                                invoice.paymentStatus ?? "unpaid",
                              )}`}
                            >
                              {getStatusLabel(invoice.paymentStatus ?? "unpaid")}
                            </span>
                          </td>

                          <td className="rounded-r-2xl border-y border-r border-[#e2e8f0] px-4 py-4">
                            {formatDate(invoice.createdAt)}
                          </td>
                        </tr>
                      );
                    })
                  : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#d7c49e] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.45em] text-[#9a5f13]">
            Vendor Connections
          </p>
          <h2 className="mt-3 text-2xl font-black text-[#001f1a]">
            Request Vendor Integration
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            For MVP, vendor connections create a request only. Later iBirdOS can
            connect vendor email, eVia, EDI, CSV import, or direct API feeds.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {vendorConnections.map((vendor) => {
              return (
                <div
                  key={vendor.name}
                  className="rounded-[22px] border border-[#e2e8f0] bg-[#fffdf8] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-black text-[#001f1a]">
                      {vendor.name}
                    </h3>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                      Later
                    </span>
                  </div>

                  <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-700">
                    {vendor.description}
                  </p>

                  <button
                    type="button"
                    className="mt-4 rounded-full border border-[#004c3f] bg-white px-5 py-3 text-sm font-black text-[#004c3f] hover:bg-[#f8faf7]"
                  >
                    Request Connection
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}