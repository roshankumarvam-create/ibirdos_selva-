"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

type InvoiceLineCategory =
  | "food_ingredient"
  | "packaging_supplies"
  | "labor_service"
  | "delivery_freight"
  | "ignore";

type InvoiceLineStatus = "needs_review" | "confirmed" | "processed" | string;

type PaymentStatus = "paid" | "unpaid" | string;

type Invoice = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: PaymentStatus;
  paidAt: string;
};

type InvoiceLine = {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  category: InvoiceLineCategory;
  rawOcrText: string;
  reviewNote: string;
  status: InvoiceLineStatus;
};

type ApiInvoiceLine = {
  id?: string | null;
  itemName?: string | null;
  item_name?: string | null;
  description?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  unitPrice?: string | number | null;
  unit_price?: string | number | null;
  lineTotal?: string | number | null;
  line_total?: string | number | null;
  category?: string | null;
  rawOcrText?: string | null;
  raw_ocr_text?: string | null;
  reviewNote?: string | null;
  review_note?: string | null;
  status?: string | null;
};

type ApiInvoice = {
  id?: string | null;
  vendorName?: string | null;
  vendor_name?: string | null;
  invoiceNumber?: string | null;
  invoice_number?: string | null;
  invoiceDate?: string | null;
  invoice_date?: string | null;
  totalAmount?: string | number | null;
  total_amount?: string | number | null;
  status?: string | null;
  paymentStatus?: string | null;
  payment_status?: string | null;
  paidAt?: string | null;
  paid_at?: string | null;
  lines?: ApiInvoiceLine[];
};

type InvoiceApiResponse = {
  success?: boolean;
  invoice?: ApiInvoice;
  lines?: ApiInvoiceLine[];
  error?: string;
  message?: string;
};

type BasicActionResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  processedLineCount?: number;
  linesProcessed?: number;
};

const categoryOptions: {
  value: InvoiceLineCategory;
  label: string;
}[] = [
  { value: "food_ingredient", label: "Food Ingredient" },
  { value: "packaging_supplies", label: "Packaging / Supplies" },
  { value: "labor_service", label: "Labor / Service" },
  { value: "delivery_freight", label: "Delivery / Freight" },
  { value: "ignore", label: "Ignore / Do Not Cost" },
];

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string): string {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeCategory(value: string | null | undefined): InvoiceLineCategory {
  if (
    value === "food_ingredient" ||
    value === "packaging_supplies" ||
    value === "labor_service" ||
    value === "delivery_freight" ||
    value === "ignore"
  ) {
    return value;
  }

  return "food_ingredient";
}

function getCategoryLabel(value: InvoiceLineCategory): string {
  return categoryOptions.find((option) => option.value === value)?.label ?? "Food Ingredient";
}

function mapInvoice(apiInvoice: ApiInvoice | undefined): Invoice | null {
  if (!apiInvoice?.id) {
    return null;
  }

  return {
    id: apiInvoice.id,
    vendorName: apiInvoice.vendorName ?? apiInvoice.vendor_name ?? "Unknown Vendor",
    invoiceNumber: apiInvoice.invoiceNumber ?? apiInvoice.invoice_number ?? "-",
    invoiceDate: apiInvoice.invoiceDate ?? apiInvoice.invoice_date ?? "",
    totalAmount: toNumber(apiInvoice.totalAmount ?? apiInvoice.total_amount),
    status: apiInvoice.status ?? "needs_review",
    paymentStatus: apiInvoice.paymentStatus ?? apiInvoice.payment_status ?? "unpaid",
    paidAt: apiInvoice.paidAt ?? apiInvoice.paid_at ?? "",
  };
}

function mapLine(apiLine: ApiInvoiceLine): InvoiceLine {
  return {
    id: apiLine.id ?? "",
    itemName: apiLine.itemName ?? apiLine.item_name ?? "Unknown Item",
    description: apiLine.description ?? "",
    quantity: toNumber(apiLine.quantity),
    unit: apiLine.unit ?? "unit",
    unitPrice: toNumber(apiLine.unitPrice ?? apiLine.unit_price),
    lineTotal: toNumber(apiLine.lineTotal ?? apiLine.line_total),
    category: normalizeCategory(apiLine.category),
    rawOcrText: apiLine.rawOcrText ?? apiLine.raw_ocr_text ?? "",
    reviewNote: apiLine.reviewNote ?? apiLine.review_note ?? "",
    status: apiLine.status ?? "needs_review",
  };
}

function statusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized === "confirmed" || normalized === "processed") {
    return "border-[#9FE8C0] bg-[#EFFFF5] text-[#006B3F]";
  }

  if (normalized === "paid") {
    return "border-[#9FE8C0] bg-[#EFFFF5] text-[#006B3F]";
  }

  return "border-[#F5D15F] bg-[#FFF9DD] text-[#A45B00]";
}

function categoryBadgeClass(category: InvoiceLineCategory): string {
  if (category === "food_ingredient") {
    return "border-[#9FE8C0] bg-[#EFFFF5] text-[#006B3F]";
  }

  if (category === "packaging_supplies") {
    return "border-[#C9D7FF] bg-[#F0F4FF] text-[#24458F]";
  }

  if (category === "labor_service") {
    return "border-[#E2C6FF] bg-[#FAF2FF] text-[#6D288F]";
  }

  if (category === "delivery_freight") {
    return "border-[#FFD1A6] bg-[#FFF4EA] text-[#A14A00]";
  }

  return "border-[#E1E5EA] bg-[#F8FAFC] text-[#475569]";
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const router = useRouter();

  const invoiceId = useMemo(() => {
    const value = params.invoiceId;
    return Array.isArray(value) ? value[0] : value;
  }, [params.invoiceId]);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [openLineId, setOpenLineId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState<boolean>(false);
  const [savingLineId, setSavingLineId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const foodLineCount = useMemo(() => {
    return lines.filter((line) => line.category === "food_ingredient").length;
  }, [lines]);

  const ignoredLineCount = useMemo(() => {
    return lines.filter((line) => line.category !== "food_ingredient").length;
  }, [lines]);

  const invoiceTotal = useMemo(() => {
    return lines.reduce((total, line) => total + line.lineTotal, 0);
  }, [lines]);

  const loadInvoice = useCallback(async (): Promise<void> => {
    if (!invoiceId) {
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as InvoiceApiResponse;

      if (!response.ok || data.success === false) {
        setError(data.error ?? "Failed to load invoice.");
        return;
      }

      const mappedInvoice = mapInvoice(data.invoice);
      const sourceLines = data.lines ?? data.invoice?.lines ?? [];

      if (!mappedInvoice) {
        setError("Invoice not found.");
        return;
      }

      setInvoice(mappedInvoice);
      setLines(sourceLines.map(mapLine).filter((line) => line.id.length > 0));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  function updateLineValue(
    lineId: string,
    field: keyof InvoiceLine,
    value: string,
  ): void {
    setLines((currentLines) =>
      currentLines.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        if (field === "quantity" || field === "unitPrice" || field === "lineTotal") {
          const numericValue = toNumber(value);
          const nextLine = {
            ...line,
            [field]: numericValue,
          };

          if (field === "quantity" || field === "unitPrice") {
            return {
              ...nextLine,
              lineTotal: Number((nextLine.quantity * nextLine.unitPrice).toFixed(2)),
            };
          }

          return nextLine;
        }

        if (field === "category") {
          return {
            ...line,
            category: normalizeCategory(value),
          };
        }

        return {
          ...line,
          [field]: value,
        };
      }),
    );
  }

  async function saveLine(line: InvoiceLine): Promise<void> {
    if (!invoiceId || !line.id) {
      return;
    }

    setSavingLineId(line.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/lines/${line.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: line.itemName,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          category: line.category,
          rawOcrText: line.rawOcrText,
          reviewNote: line.reviewNote,
        }),
      });

      const data = (await response.json()) as BasicActionResponse;

      if (!response.ok || data.success === false) {
        setError(data.error ?? "Failed to save invoice line.");
        return;
      }

      setMessage("Invoice line saved.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save invoice line.");
    } finally {
      setSavingLineId("");
    }
  }

  async function handleConfirmInvoice(): Promise<void> {
    if (!invoiceId) {
      return;
    }

    setIsConfirming(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/confirm`, {
        method: "POST",
      });

      const data = (await response.json()) as BasicActionResponse;

      if (!response.ok || data.success === false) {
        setError(data.error ?? "Failed to confirm invoice.");
        return;
      }

      const count = data.processedLineCount ?? data.linesProcessed ?? 0;

      setMessage(`Invoice confirmed. ${count} food line item(s) processed.`);
      await loadInvoice();
    } catch (confirmError: unknown) {
      setError(
        confirmError instanceof Error ? confirmError.message : "Failed to confirm invoice.",
      );
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleMarkPaid(): Promise<void> {
    if (!invoiceId) {
      return;
    }

    setIsMarkingPaid(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
      });

      const data = (await response.json()) as BasicActionResponse;

      if (!response.ok || data.success === false) {
        setError(data.error ?? "Failed to mark invoice as paid.");
        return;
      }

      setMessage("Invoice marked as paid.");
      await loadInvoice();
    } catch (paidError: unknown) {
      setError(paidError instanceof Error ? paidError.message : "Failed to mark paid.");
    } finally {
      setIsMarkingPaid(false);
    }
  }

  function handleCategoryChange(
    event: ChangeEvent<HTMLSelectElement>,
    line: InvoiceLine,
  ): void {
    const category = normalizeCategory(event.target.value);
    const updatedLine = {
      ...line,
      category,
    };

    setLines((currentLines) =>
      currentLines.map((currentLine) =>
        currentLine.id === line.id ? updatedLine : currentLine,
      ),
    );

    void saveLine(updatedLine);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#F7F1E3] px-6 py-10 text-[#001F1A]">
        <section className="mx-auto max-w-6xl rounded-[28px] border border-[#D7C49E] bg-white p-8 shadow">
          <p className="text-sm font-black">Loading invoice...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F1E3] px-4 py-8 text-[#001F1A] sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] border border-[#D7C49E] bg-white p-6 shadow sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#9A5F13]">
                Invoice Review
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] sm:text-5xl">
                Supplier Invoice Detail
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700">
                Review supplier invoice lines, choose line category, then confirm
                food ingredients into cost, price history, alerts, and recipe cost.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/invoices"
                className="rounded-full border border-[#005445] px-6 py-3 text-sm font-black text-[#005445]"
              >
                Back to Invoices
              </Link>

              <button
                type="button"
                onClick={() => void loadInvoice()}
                className="rounded-full border border-[#D7C49E] px-6 py-3 text-sm font-black"
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={() => void handleConfirmInvoice()}
                disabled={isConfirming || foodLineCount === 0}
                className="rounded-full bg-[#005445] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isConfirming ? "Confirming..." : "Confirm Invoice"}
              </button>

              <button
                type="button"
                onClick={() => void handleMarkPaid()}
                disabled={isMarkingPaid || invoice?.paymentStatus === "paid"}
                className="rounded-full bg-[#A96716] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMarkingPaid
                  ? "Marking..."
                  : invoice?.paymentStatus === "paid"
                    ? "Paid"
                    : "Mark as Paid"}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-black text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
            {message}
          </div>
        ) : null}

        {invoice ? (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-3xl border border-[#D7C49E] bg-white p-5 shadow">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#50658A]">
                Vendor
              </p>
              <p className="mt-4 text-xl font-black">{invoice.vendorName}</p>
            </div>

            <div className="rounded-3xl border border-[#D7C49E] bg-white p-5 shadow">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#50658A]">
                Invoice #
              </p>
              <p className="mt-4 text-xl font-black">{invoice.invoiceNumber}</p>
            </div>

            <div className="rounded-3xl border border-[#D7C49E] bg-white p-5 shadow">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#50658A]">
                Invoice Date
              </p>
              <p className="mt-4 text-xl font-black">{formatDate(invoice.invoiceDate)}</p>
            </div>

            <div className="rounded-3xl border border-[#D7C49E] bg-white p-5 shadow">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#50658A]">
                Status
              </p>
              <span
                className={`mt-4 inline-flex rounded-full border px-4 py-2 text-xs font-black capitalize ${statusBadgeClass(
                  invoice.status,
                )}`}
              >
                {invoice.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="rounded-3xl border border-[#D7C49E] bg-white p-5 shadow">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#50658A]">
                Payment
              </p>
              <span
                className={`mt-4 inline-flex rounded-full border px-4 py-2 text-xs font-black capitalize ${statusBadgeClass(
                  invoice.paymentStatus,
                )}`}
              >
                {invoice.paymentStatus}
              </span>
            </div>
          </div>
        ) : null}

        <div className="rounded-[28px] border border-[#D7C49E] bg-white p-5 shadow sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#9A5F13]">
                Invoice Lines
              </p>
              <h2 className="mt-4 text-2xl font-black">SAP-style Line Review</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Use category to control what updates ingredient costs. Long OCR text is hidden under details.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#D7C49E] bg-[#FFF9EC] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#50658A]">
                  Invoice Total
                </p>
                <p className="mt-2 text-2xl font-black">
                  {formatCurrency(invoice?.totalAmount || invoiceTotal)}
                </p>
              </div>

              <div className="rounded-2xl border border-[#D7C49E] bg-[#FFF9EC] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#50658A]">
                  Food Lines
                </p>
                <p className="mt-2 text-2xl font-black">{foodLineCount}</p>
              </div>

              <div className="rounded-2xl border border-[#D7C49E] bg-[#FFF9EC] px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#50658A]">
                  Ignored
                </p>
                <p className="mt-2 text-2xl font-black">{ignoredLineCount}</p>
              </div>
            </div>
          </div>

          <div className="mt-7 overflow-x-auto">
            <div className="min-w-[1180px]">
              <div className="grid grid-cols-[190px_280px_90px_90px_120px_120px_145px_130px] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-[#50658A]">
                <div>Category</div>
                <div>Item</div>
                <div>Qty</div>
                <div>Unit</div>
                <div>Unit Price</div>
                <div>Line Total</div>
                <div>Status</div>
                <div>Action</div>
              </div>

              <div className="divide-y divide-slate-200">
                {lines.map((line) => (
                  <div key={line.id} className="bg-white">
                    <div className="grid grid-cols-[190px_280px_90px_90px_120px_120px_145px_130px] gap-3 px-4 py-4 text-sm font-bold">
                      <div>
                        <select
                          value={line.category}
                          onChange={(event) => handleCategoryChange(event, line)}
                          className={`w-full rounded-xl border px-3 py-2 text-xs font-black ${categoryBadgeClass(
                            line.category,
                          )}`}
                        >
                          {categoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          value={line.itemName}
                          onChange={(event) =>
                            updateLineValue(line.id, "itemName", event.target.value)
                          }
                          onBlur={() => void saveLine(line)}
                          className="w-full rounded-xl border border-slate-200 bg-[#FFFCF5] px-3 py-2 text-sm font-black"
                        />
                        <p className="mt-2 text-xs font-bold text-slate-500">
                          {getCategoryLabel(line.category)}
                        </p>
                      </div>

                      <div>
                        <input
                          value={line.quantity}
                          onChange={(event) =>
                            updateLineValue(line.id, "quantity", event.target.value)
                          }
                          onBlur={() => void saveLine(line)}
                          className="w-full rounded-xl border border-slate-200 bg-[#FFFCF5] px-3 py-2 text-sm font-black"
                        />
                      </div>

                      <div>
                        <input
                          value={line.unit}
                          onChange={(event) =>
                            updateLineValue(line.id, "unit", event.target.value)
                          }
                          onBlur={() => void saveLine(line)}
                          className="w-full rounded-xl border border-slate-200 bg-[#FFFCF5] px-3 py-2 text-sm font-black"
                        />
                      </div>

                      <div>
                        <input
                          value={line.unitPrice}
                          onChange={(event) =>
                            updateLineValue(line.id, "unitPrice", event.target.value)
                          }
                          onBlur={() => void saveLine(line)}
                          className="w-full rounded-xl border border-slate-200 bg-[#FFFCF5] px-3 py-2 text-sm font-black"
                        />
                      </div>

                      <div className="pt-2 font-black">{formatCurrency(line.lineTotal)}</div>

                      <div>
                        <span
                          className={`inline-flex rounded-full border px-3 py-2 text-xs font-black capitalize ${statusBadgeClass(
                            line.status,
                          )}`}
                        >
                          {line.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenLineId(openLineId === line.id ? "" : line.id)
                          }
                          className="rounded-full border border-[#005445] px-4 py-2 text-xs font-black text-[#005445]"
                        >
                          {openLineId === line.id ? "Hide" : "Details"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void saveLine(line)}
                          disabled={savingLineId === line.id}
                          className="rounded-full bg-[#005445] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                        >
                          {savingLineId === line.id ? "Saving" : "Save"}
                        </button>
                      </div>
                    </div>

                    {openLineId === line.id ? (
                      <div className="mx-4 mb-4 rounded-2xl border border-[#D7C49E] bg-[#FFF9EC] p-4">
                        <label className="block">
                          <span className="text-xs font-black uppercase tracking-[0.25em] text-[#50658A]">
                            Description
                          </span>
                          <textarea
                            value={line.description}
                            onChange={(event) =>
                              updateLineValue(line.id, "description", event.target.value)
                            }
                            onBlur={() => void saveLine(line)}
                            rows={3}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                          />
                        </label>

                        <label className="mt-4 block">
                          <span className="text-xs font-black uppercase tracking-[0.25em] text-[#50658A]">
                            Review Note
                          </span>
                          <textarea
                            value={line.reviewNote}
                            onChange={(event) =>
                              updateLineValue(line.id, "reviewNote", event.target.value)
                            }
                            onBlur={() => void saveLine(line)}
                            rows={2}
                            placeholder="Example: classify as packaging, ignore for ingredient costing, confirm as onion..."
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                          />
                        </label>

                        {line.rawOcrText ? (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#50658A]">
                              Raw OCR Text
                            </p>
                            <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
                              {line.rawOcrText}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              {lines.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-[#FFFCF5] p-5 text-sm font-black">
                  No invoice lines found.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#D7C49E] bg-white p-6 shadow sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#9A5F13]">
                Engine Action
              </p>
              <h2 className="mt-4 text-2xl font-black">Confirm Invoice Engine</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                Confirm should process food ingredient lines into Ingredient, PriceHistory,
                Alert, and recipe cost. Packaging, labor, delivery, and ignored lines should
                not become ingredients.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleConfirmInvoice()}
              disabled={isConfirming || foodLineCount === 0}
              className="rounded-full bg-[#005445] px-8 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConfirming ? "Running Engine..." : "Confirm Food Lines"}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#D7C49E] bg-white p-6 shadow sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.45em] text-[#9A5F13]">
                Payment Tracking
              </p>
              <h2 className="mt-4 text-2xl font-black">Vendor Payment Status</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
                For MVP, iBirdOS tracks whether the invoice is paid. Actual payment can
                connect later through QuickBooks, Wave, or ACH.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleMarkPaid()}
              disabled={isMarkingPaid || invoice?.paymentStatus === "paid"}
              className="rounded-full bg-[#A96716] px-8 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMarkingPaid
                ? "Marking Paid..."
                : invoice?.paymentStatus === "paid"
                  ? "Paid"
                  : "Mark as Paid"}
            </button>
          </div>

          {invoice?.paidAt ? (
            <p className="mt-4 text-sm font-black text-emerald-700">
              Paid on {formatDate(invoice.paidAt)}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}