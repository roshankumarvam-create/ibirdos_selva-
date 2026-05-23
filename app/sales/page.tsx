"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type SalesEntry = {
  id: string;
  salesDate: string;
  locationName: string;
  shiftName: string;
  totalSales: number;
  breakfastSales: number;
  lunchSales: number;
  cateringSales: number;
  barSales: number;
  thirdPartySales: number;
  refunds: number;
  voids: number;
  discounts: number;
  posTotal: number;
  cashDeposit: number;
  cardTotal: number;
  giftCardTotal: number;
  houseAccountTotal: number;
  varianceAmount: number;
  laborCost: number;
  rentCost: number;
  foodCost: number;
  lcVsSalesPercent: number;
  rentVsSalesPercent: number;
  foodCostPercent: number;
  notes: string;
  status: string;
  reviewdAt?: string | null;
  reviewedBy?: string | null
  reviewNote?: string | null;
  lockedAt?: string | null; 
  createdAt: string;
  updatedAt: string;
};

type SalesSummary = {
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
};

type SalesApiResponse = {
  success: boolean;
  companyId?: string;
  summary?: SalesSummary;
  dailySales?: SalesEntry[];
  error?: string;
};

type SalesFormState = {
  salesDate: string;
  locationName: string;
  shiftName: string;
  breakfastSales: string;
  lunchSales: string;
  cateringSales: string;
  barSales: string;
  thirdPartySales: string;
  refunds: string;
  voids: string;
  discounts: string;
  posTotal: string;
  cashDeposit: string;
  cardTotal: string;
  giftCardTotal: string;
  houseAccountTotal: string;
  laborCost: string;
  rentCost: string;
  foodCost: string;
  notes: string;
};

const emptySummary: SalesSummary = {
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialForm(): SalesFormState {
  return {
    salesDate: todayIsoDate(),
    locationName: "Main Location",
    shiftName: "Daily",
    breakfastSales: "",
    lunchSales: "",
    cateringSales: "",
    barSales: "",
    thirdPartySales: "",
    refunds: "",
    voids: "",
    discounts: "",
    posTotal: "",
    cashDeposit: "",
    cardTotal: "",
    giftCardTotal: "",
    houseAccountTotal: "",
    laborCost: "",
    rentCost: "",
    foodCost: "",
    notes: "",
  };
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(/[$,%\s,]/g, ""));

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function percent(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) {
    return 0;
  }

  return Number(((part / whole) * 100).toFixed(2));
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number): string {
  if (!value) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
}

function formatDateOnly(value: string): string {
    if (!value) {
       return "-";
    }
    
    const date = new Date(value);

    if (!Number.isFinite(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
}

function getVarianceText(value: number): string {
  if (value === 0) {
    return "Balanced";
  }

  if (value > 0) {
    return "Over";
  }

  return "Short";
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder = "0.00",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
        {label}
      </span>
      <input
        suppressHydrationWarning
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-[#d7c49e] bg-white px-4 py-3 text-sm font-bold text-[#002515] outline-none focus:border-[#005445]"
      />
    </label>
  );
}

export default function SalesPage() {
  const [form, setForm] = useState<SalesFormState>(createInitialForm);
  const [summary, setSummary] = useState<SalesSummary>(emptySummary);
  const [entries, setEntries] = useState<SalesEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const calculatedSales = useMemo(() => {
    return roundMoney(
      toNumber(form.breakfastSales) +
        toNumber(form.lunchSales) +
        toNumber(form.cateringSales) +
        toNumber(form.barSales) +
        toNumber(form.thirdPartySales) -
        toNumber(form.refunds) -
        toNumber(form.voids) -
        toNumber(form.discounts),
    );
  }, [
    form.breakfastSales,
    form.lunchSales,
    form.cateringSales,
    form.barSales,
    form.thirdPartySales,
    form.refunds,
    form.voids,
    form.discounts,
  ]);

  const posTotal = useMemo(() => {
    const enteredPosTotal = toNumber(form.posTotal);

    if (enteredPosTotal > 0) {
      return roundMoney(enteredPosTotal);
    }

    return calculatedSales;
  }, [calculatedSales, form.posTotal]);

  const paymentTotal = useMemo(() => {
    return roundMoney(
      toNumber(form.cashDeposit) +
        toNumber(form.cardTotal) +
        toNumber(form.giftCardTotal) +
        toNumber(form.houseAccountTotal),
    );
  }, [
    form.cashDeposit,
    form.cardTotal,
    form.giftCardTotal,
    form.houseAccountTotal,
  ]);

  const varianceAmount = useMemo(() => {
    return roundMoney(paymentTotal - posTotal);
  }, [paymentTotal, posTotal]);

  const laborPercent = useMemo(() => {
    return percent(toNumber(form.laborCost), calculatedSales);
  }, [calculatedSales, form.laborCost]);

  const rentPercent = useMemo(() => {
    return percent(toNumber(form.rentCost), calculatedSales);
  }, [calculatedSales, form.rentCost]);

  const foodCostPercent = useMemo(() => {
    return percent(toNumber(form.foodCost), calculatedSales);
  }, [calculatedSales, form.foodCost]);

  const latestEntry = entries.length > 0 ? entries[0] : null;

  const isReviewedLocked = latestEntry?.status === "reviewed";

  function updateForm(field: keyof SalesFormState, value: string): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function loadSales(): Promise<void> {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`/api/sales?date=${form.salesDate}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as SalesApiResponse;

      if (!response.ok || data.success === false) {
        setError(data.error ?? "Failed to load sales.");
        return;
      }

      setSummary(data.summary ?? emptySummary);
      setEntries(Array.isArray(data.dailySales) ? data.dailySales : []);
    } catch (loadError: unknown) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load sales.",
      );
    } finally {
      setIsLoading(false);
    }
  }
async function handleReviewLock(
  entryId: string,
  action: "review_lock" | "unlock",
): Promise<void> {
  try {
    setMessage("");
    setError("");

    const response = await fetch("/api/sales", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: entryId,
        action,
        reviewNote:
          action === "review_lock"
            ? "Manager reviewed daily closeout."
            : "Manager unlocked daily closeout.",
      }),
    });

    const data = (await response.json()) as SalesApiResponse;

    if (!response.ok || data.success === false) {
      setError(data.error ?? "Failed to update sales entry.");
      return;
    }

    setMessage(
      action === "review_lock"
        ? "Sales entry reviewed and locked."
        : "Sales entry unlocked.",
    );

    await loadSales();
  } catch (reviewError: unknown) {
    setError(
      reviewError instanceof Error
        ? reviewError.message
        : "Failed to update sales entry.",
    );
  }
}
  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    try {
      setIsSaving(true);
      setMessage("");
      setError("");

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salesDate: form.salesDate,
          locationName: form.locationName,
          shiftName: form.shiftName,
          totalSales: calculatedSales,
          breakfastSales: toNumber(form.breakfastSales),
          lunchSales: toNumber(form.lunchSales),
          cateringSales: toNumber(form.cateringSales),
          barSales: toNumber(form.barSales),
          thirdPartySales: toNumber(form.thirdPartySales),
          refunds: toNumber(form.refunds),
          voids: toNumber(form.voids),
          discounts: toNumber(form.discounts),
          posTotal,
          cashDeposit: toNumber(form.cashDeposit),
          cardTotal: toNumber(form.cardTotal),
          giftCardTotal: toNumber(form.giftCardTotal),
          houseAccountTotal: toNumber(form.houseAccountTotal),
          laborCost: toNumber(form.laborCost),
          rentCost: toNumber(form.rentCost),
          foodCost: toNumber(form.foodCost),
          notes: form.notes,
          salesLines: [
            {
              name: "Breakfast Sales",
              category: "food_sales",
              amount: toNumber(form.breakfastSales),
              count: 0,
            },
            {
              name: "Lunch Sales",
              category: "food_sales",
              amount: toNumber(form.lunchSales),
              count: 0,
            },
            {
              name: "Catering Sales",
              category: "catering_sales",
              amount: toNumber(form.cateringSales),
              count: 0,
            },
            {
              name: "Bar Sales",
              category: "bar_sales",
              amount: toNumber(form.barSales),
              count: 0,
            },
            {
              name: "3rd Party Sales",
              category: "third_party_sales",
              amount: toNumber(form.thirdPartySales),
              count: 0,
            },
          ],
          paymentLines: [
            {
              tenderType: "Cash Deposit",
              amount: toNumber(form.cashDeposit),
              count: 0,
            },
            {
              tenderType: "Card Total",
              amount: toNumber(form.cardTotal),
              count: 0,
            },
            {
              tenderType: "Gift Card",
              amount: toNumber(form.giftCardTotal),
              count: 0,
            },
            {
              tenderType: "House Account",
              amount: toNumber(form.houseAccountTotal),
              count: 0,
            },
          ],
        }),
      });

      const data = (await response.json()) as SalesApiResponse;

      if (!response.ok || data.success === false) {
        setError(data.error ?? "Failed to save sales entry.");
        return;
      }

      setMessage("Daily sales entry saved.");
      await loadSales();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save sales entry.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    void loadSales();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f0e6] px-4 py-8 text-[#172033] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-[#dfd1bd] bg-white p-8 shadow-lg">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9a5f13]">
                Daily Sales Entry
              </p>
              <h1 className="mt-4 text-5xl font-black text-[#002515]">
                Sales closeout.
                <br />
                Profit control.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[#667085]">
                Enter POS sales, payment totals, labor cost, rent cost, food
                cost, bar sales, and 3rd-party revenue. Dashboard cards update
                from this sales API.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-[#005445] bg-white px-5 py-3 text-sm font-black text-[#005445]"
              >
                Dashboard
              </Link>

              <Link
                href="/invoices"
                className="rounded-2xl bg-[#005445] px-5 py-3 text-sm font-black text-white"
              >
                Invoices
              </Link>
            </div>
          </div>
        </section>

        {message ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-800">
            {error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold">Sales Today</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {isLoading ? "..." : formatCurrency(summary.salesToday)}
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9a5f13]">
              Entries: {isLoading ? "..." : summary.salesEntryCount}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold">POS Variance</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {isLoading ? "..." : formatCurrency(summary.posVariance)}
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9a5f13]">
              {getVarianceText(summary.posVariance)}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold">LC vs Sales</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {isLoading ? "..." : formatPercent(summary.lcVsSalesPercent)}
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9a5f13]">
              Labor cost
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold">Sales vs Food Cost</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {isLoading
                ? "..."
                : formatPercent(summary.salesVsFoodCostPercent)}
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9a5f13]">
              Target 28% - 32%
            </p>
          </div>
          <div className="rounded-3xl border bg-white p-5">
         <p className="text-sm font-bold">3rd Party Sales</p>
          <p className="mt-4 text-4xl font-black text-[#002515]">
           {isLoading ? "..." : formatCurrency(summary.thirdPartyRevenue)}
         </p>
          <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9a5f13]">
            Delivery platforms
            </p>
            </div>

<div className="rounded-3xl border bg-white p-5">
  <p className="text-sm font-bold">Bar Sales</p>
  <p className="mt-4 text-4xl font-black text-[#002515]">
    {isLoading ? "..." : formatCurrency(summary.barRevenue)}
  </p>
  <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#9a5f13]">
    Beverage sales
  </p>
</div>
        </section>

        <section className="mt-6 grid gap-6">
          {isReviewedLocked ? (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
                This sales entry is REVIEWED and locked. Click Unlock before editing or saving changes.
              </div>
           ) : null}
           
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="rounded-[32px] border border-[#dfd1bd] bg-white p-6 shadow"
            >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9a5f13]">
                  Entry Form
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#002515]">
                  Post Daily Sales
                </h2>
              </div>

              <button
                suppressHydrationWarning
                type="submit"
                disabled={isSaving || isReviewedLocked}
                className="rounded-2xl bg-[#005445] px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReviewedLocked ? "Reviewed / Locked" : isSaving ? "Saving..." : "Save Sales Entry"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                  Sales Date
                </span>
                <input
                  suppressHydrationWarning
                  type="date"
                  value={form.salesDate}
                  onChange={(event) =>
                    updateForm("salesDate", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#d7c49e] bg-white px-4 py-3 text-sm font-bold text-[#002515] outline-none focus:border-[#005445]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                  Location
                </span>
                <input
                suppressHydrationWarning
                  type="text"
                  value={form.locationName}
                  onChange={(event) =>
                    updateForm("locationName", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#d7c49e] bg-white px-4 py-3 text-sm font-bold text-[#002515] outline-none focus:border-[#005445]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                  Shift
                </span>
                <select
                  suppressHydrationWarning
                  value={form.shiftName}
                  onChange={(event) =>
                    updateForm("shiftName", event.target.value)
                  }
                  className="mt-2 w-full rounded-2xl border border-[#d7c49e] bg-white px-4 py-3 text-sm font-bold text-[#002515] outline-none focus:border-[#005445]"
                >
                  <option value="Daily">Daily</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Catering">Catering</option>
                  <option value="Bar">Bar</option>
                </select>
              </label>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-black text-[#002515]">
                Sales Items
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <NumberInput
                  label="Breakfast Sales"
                  value={form.breakfastSales}
                  onChange={(value) => updateForm("breakfastSales", value)}
                />

                <NumberInput
                  label="Lunch Sales"
                  value={form.lunchSales}
                  onChange={(value) => updateForm("lunchSales", value)}
                />

                <NumberInput
                  label="Catering Sales"
                  value={form.cateringSales}
                  onChange={(value) => updateForm("cateringSales", value)}
                />

                <NumberInput
                  label="Bar Sales"
                  value={form.barSales}
                  onChange={(value) => updateForm("barSales", value)}
                />

                <NumberInput
                  label="3rd Party Sales"
                  value={form.thirdPartySales}
                  onChange={(value) => updateForm("thirdPartySales", value)}
                />

                <NumberInput
                  label="Refunds"
                  value={form.refunds}
                  onChange={(value) => updateForm("refunds", value)}
                />

                <NumberInput
                  label="Voids"
                  value={form.voids}
                  onChange={(value) => updateForm("voids", value)}
                />

                <NumberInput
                  label="Discounts"
                  value={form.discounts}
                  onChange={(value) => updateForm("discounts", value)}
                />

                <div className="rounded-2xl border border-[#d7c49e] bg-[#fff8eb] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a5f13]">
                    Total Sales
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#002515]">
                    {formatCurrency(calculatedSales)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-black text-[#002515]">
                Payment Closeout
              </h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <NumberInput
                  label="POS Total"
                  value={form.posTotal}
                  onChange={(value) => updateForm("posTotal", value)}
                />

                <NumberInput
                  label="Cash Deposit"
                  value={form.cashDeposit}
                  onChange={(value) => updateForm("cashDeposit", value)}
                />

                <NumberInput
                  label="Card Total"
                  value={form.cardTotal}
                  onChange={(value) => updateForm("cardTotal", value)}
                />

                <NumberInput
                  label="Gift Card Total"
                  value={form.giftCardTotal}
                  onChange={(value) => updateForm("giftCardTotal", value)}
                />

                <NumberInput
                  label="House Account"
                  value={form.houseAccountTotal}
                  onChange={(value) => updateForm("houseAccountTotal", value)}
                />

                <div className="rounded-2xl border border-[#d7c49e] bg-[#fff8eb] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a5f13]">
                    Variance
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#002515]">
                    {formatCurrency(varianceAmount)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-[#53627a]">
                    {getVarianceText(varianceAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-black text-[#002515]">
                Cost Control
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <NumberInput
                  label="Labor Cost"
                  value={form.laborCost}
                  onChange={(value) => updateForm("laborCost", value)}
                />

                <NumberInput
                  label="Rent Cost"
                  value={form.rentCost}
                  onChange={(value) => updateForm("rentCost", value)}
                />

                <NumberInput
                  label="Food Cost"
                  value={form.foodCost}
                  onChange={(value) => updateForm("foodCost", value)}
                />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="min-w-0 rounded-2xl border bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                    LC vs Sales
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#002515]">
                    {formatPercent(laborPercent)}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                    Rent vs Sales
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#002515]">
                    {formatPercent(rentPercent)}
                  </p>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                    Sales vs Food Cost
                  </p>
                  <p className="mt-2 text-3xl font-black text-[#002515]">
                    {formatPercent(foodCostPercent)}
                  </p>
                </div>
              </div>
            </div>

            <label className="mt-8 block">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#53627a]">
                Notes
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-[#d7c49e] bg-white px-4 py-3 text-sm font-bold text-[#002515] outline-none focus:border-[#005445]"
                placeholder="Manager notes, cash over/short reason, event notes..."
              />
            </label>
          </form>

          <aside className="rounded-[32px] border border-[#dfd1bd] bg-white p-6 shadow">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#9a5f13]">
              Today Summary
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#002515]">
              Posted Entries
            </h2>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#d7c49e]">
  <table className="w-full min-w-[720px] border-collapse bg-white text-sm">
    <thead className="bg-[#fff8eb]">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Date
        </th>
        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Location
        </th>
        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Shift
        </th>
        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Sales
        </th>
        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Variance
        </th>
        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Food %
        </th>
        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          LC %
        </th>
        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Status
        </th>
        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.18em] text-[#53627a]">
          Action
        </th>
      </tr>
    </thead>

    <tbody>
      {entries.length === 0 ? (
        <tr>
          <td
            colSpan={8}
            className="px-4 py-8 text-center text-sm font-bold text-[#667085]"
          >
            No sales entries yet. Save today&apos;s sales closeout to update the dashboard.
          </td>
        </tr>
      ) : (
        entries.map((entry) => (
          <tr key={entry.id} className="border-t border-[#eadfce]">
            <td className="px-4 py-4 font-bold text-[#002515]">
              {formatDateOnly(entry.salesDate)} 
            </td>
            <td className="px-4 py-4 font-bold text-[#002515]">
              {entry.locationName}
            </td>
            <td className="px-4 py-4 text-[#53627a]">
              {entry.shiftName}
            </td>
            <td className="px-4 py-4 text-right font-black text-[#002515]">
              {formatCurrency(entry.totalSales)}
            </td>
            <td className="px-4 py-4 text-right font-black text-[#002515]">
              {formatCurrency(entry.varianceAmount)}
            </td>
            <td className="px-4 py-4 text-right font-black text-[#002515]">
              {formatPercent(entry.foodCostPercent)}
            </td>
            <td className="px-4 py-4 text-right font-black text-[#002515]">
              {formatPercent(entry.lcVsSalesPercent)}
            </td>
            <td className="px-4 py-4">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
                {entry.status}
              </span>
            </td>
            <td className="px-4 py-4">
  <button
    type="button"
    onClick={() =>
      void handleReviewLock(
        entry.id,
        entry.status === "reviewed" ? "unlock" : "review_lock",
      )
    }
    className="rounded-full border border-[#005445] px-3 py-2 text-xs font-black uppercase text-[#005445]"
  >
    {entry.status === "reviewed" ? "Unlock" : "Review & Lock"}
  </button>
</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}