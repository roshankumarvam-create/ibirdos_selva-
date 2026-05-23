"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type KitchenEvent = {
  id: string;
  title: string;
  customerName: string;
  eventDate: string | null;
  status: string;
  guestCount: number;
};

type EventMenuLine = {
  id: string;
  recipeName: string;
  station: string;
  prepStatus: string;
  prepPortions: number;
};

type StaffConfirmationSummary = {
  total: number;
  pending: number;
  confirmed: number;
  needsHelp: number;
  blocked: number;
};

type StaffConfirmation = {
  id: string;
  staffName: string;
  station: string;
  confirmationType: string;
  status: string;
  confirmedAt: string | null;
};

type EventDashboardRow = {
  event: KitchenEvent;
  menuLines: EventMenuLine[];
  staffSummary: StaffConfirmationSummary;
  confirmations: StaffConfirmation[];
  foodCost: number;
  revenue: number;
  margin: number;
};

type DateFilter = "today" | "tomorrow" | "week" | "all";

type StationFilter =
  | "all"
  | "Unassigned"
  | "Prep"
  | "Hot Kitchen"
  | "Cold Kitchen"
  | "Hot Station"
  | "Cold Station"
  | "grill"
  | "oven"
  | "Tandoor"
  | "Saute"
  | "Bakery"
  | "Fry"
  | "Packing"
  | "packaging"
  | "Delivery";

type PrepStatusFilter =
  | "all"
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Blocked";

type ManagerActionType =
  | "BLOCKED"
  | "NEEDS_HELP"
  | "UNCONFIRMED_STAFF"
  | "PREP_NOT_STARTED"
  | "LOW_MARGIN"
  | "PACKET_READY";

type ManagerActionItem = {
  id: string;
  eventId: string;
  eventTitle: string;
  type: ManagerActionType;
  title: string;
  message: string;
  severity: "high" | "medium" | "low" | "good";
};

type EventsResponse = {
  success?: boolean;
  events?: unknown[];
  data?: unknown[];
  error?: string;
};

type RecipeLinesResponse = {
  success?: boolean;
  lines?: unknown[];
  data?: unknown[];
  eventProfit?: unknown;
  error?: string;
};

type StaffConfirmationsResponse = {
  success?: boolean;
  confirmations?: unknown[];
  summary?: unknown;
  error?: string;
};

const dateFilterOptions: Array<{
  key: DateFilter;
  label: string;
}> = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This Week" },
  { key: "all", label: "All Events" },
];

const stationFilterOptions: Array<{
  key: StationFilter;
  label: string;
}> = [
  { key: "all", label: "All Stations" },
  { key: "Unassigned", label: "Unassigned" },
  { key: "Hot Kitchen", label: "Hot Kitchen" },
  { key: "Cold Kitchen", label: "Cold Kitchen" },
  { key: "Prep", label: "Prep" },
  { key: "Hot Station", label: "Hot Station" },
  { key: "Cold Station", label: "Cold Station" },
  { key: "grill", label: "Grill" },
  { key: "oven", label: "Oven" },
  { key: "Tandoor", label: "Tandoor" },
  { key: "Saute", label: "Saute" },
  { key: "Bakery", label: "Bakery" },
  { key: "Fry", label: "Fry" },
  { key: "Packing", label: "Packing" },
  { key: "packaging", label: "Packaging" },
  { key: "Delivery", label: "Delivery" },
];

const stationAssignmentOptions: Array<{
  key: Exclude<StationFilter, "all">;
  label: string;
}> = [
  { key: "Unassigned", label: "Unassigned" },
  { key: "Prep", label: "Prep" },
  { key: "Hot Kitchen", label: "Hot Kitchen" },
  { key: "Cold Kitchen", label: "Cold Kitchen" },
  { key: "Hot Station", label: "Hot Station" },
  { key: "Cold Station", label: "Cold Station" },
  { key: "grill", label: "Grill" },
  { key: "oven", label: "Oven" },
  { key: "Tandoor", label: "Tandoor" },
  { key: "Saute", label: "Saute" },
  { key: "Bakery", label: "Bakery" },
  { key: "Fry", label: "Fry" },
  { key: "Packing", label: "Packing" },
  { key: "packaging", label: "Packaging" },
  { key: "Delivery", label: "Delivery" },
];

const prepStatusFilterOptions: Array<{
  key: PrepStatusFilter;
  label: string;
}> = [
  { key: "all", label: "All Status" },
  { key: "Not Started", label: "Not Started" },
  { key: "In Progress", label: "In Progress" },
  { key: "Completed", label: "Completed" },
  { key: "Blocked", label: "Blocked" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatEventDate(value: string | null): string {
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

function normalizeEvent(value: unknown): KitchenEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    title: readString(
      value.title ?? value.name ?? value.eventName ?? value.event_name,
      "Untitled Event",
    ),
    customerName: readString(
      value.customerName ??
        value.customer_name ??
        value.clientName ??
        value.client_name,
      "Customer",
    ),
    eventDate: readNullableString(
      value.eventDate ?? value.event_date ?? value.date ?? value.delivery_date,
    ),
    status: readString(value.status, "DRAFT"),
    guestCount: readNumber(value.guestCount ?? value.guest_count, 0),
  };
}

function normalizeMenuLine(value: unknown): EventMenuLine | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    recipeName: readString(
      value.recipeName ?? value.recipe_name ?? value.name,
      "Unnamed Recipe",
    ),
    station: readString(
  value.station ?? value.prepStation ?? value.prep_station,
  "Unassigned",
), 
prepStatus: readString(
  value.prepStatus ?? value.prep_status ?? value.status,
  "Not Started",
), 
prepPortions: readNumber(
  value.prepPortions ?? 
  value.prep_portions ?? 
  value.kitchenPrepPortions ?? 
  value.kitchen_prep_portions,
  0,
)
 }; 
}
function normalizeStaffConfirmation(value: unknown): StaffConfirmation | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    staffName: readString(value.staffName ?? value.staff_name, "Unknown Staff"),
    station: readString(value.station, "Unassigned"),
    confirmationType: readString(
      value.confirmationType ?? value.confirmation_type,
      "PACKET_REVIEWED",
    ),
    status: readString(value.status, "PENDING"),
    confirmedAt: readNullableString(value.confirmedAt ?? value.confirmed_at),
  };
}

function normalizeStaffSummary(value: unknown): StaffConfirmationSummary {
  if (!isRecord(value)) {
    return {
      total: 0,
      pending: 0,
      confirmed: 0,
      needsHelp: 0,
      blocked: 0,
    };
  }

  return {
    total: readNumber(value.total, 0),
    pending: readNumber(value.pending, 0),
    confirmed: readNumber(value.confirmed, 0),
    needsHelp: readNumber(value.needsHelp ?? value.needs_help, 0),
    blocked: readNumber(value.blocked, 0),
  };
}

function readEventProfit(value: unknown): {
  revenue: number;
  foodCost: number;
  margin: number;
} {
  if (!isRecord(value)) {
    return {
      revenue: 0,
      foodCost: 0,
      margin: 0,
    };
  }

  return {
    revenue: readNumber(value.revenue, 0),
    foodCost: readNumber(value.foodCost ?? value.food_cost, 0),
    margin: readNumber(
      value.margin ?? value.marginPercent ?? value.margin_percent,
      0,
    ),
  };
}

function getPrepNotStartedCount(lines: EventMenuLine[]): number {
  return lines.filter((line) =>
    line.prepStatus.toLowerCase().includes("not"),
  ).length;
}

function getPrepInProgressCount(lines: EventMenuLine[]): number {
  return lines.filter((line) =>
    line.prepStatus.toLowerCase().includes("progress"),
  ).length;
}

function getPrepCompletedCount(lines: EventMenuLine[]): number {
  return lines.filter((line) =>
    line.prepStatus.toLowerCase().includes("complete"),
  ).length;
}

function getPrepBlockedCount(lines: EventMenuLine[]): number {
  return lines.filter((line) =>
    line.prepStatus.toLowerCase().includes("block"),
  ).length;
}

function getFilteredRows(
  rows: EventDashboardRow[],
  dateFilter: DateFilter,
): EventDashboardRow[] {
  if (dateFilter === "all") {
    return rows;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const dayAfterTomorrowStart = new Date(todayStart);
  dayAfterTomorrowStart.setDate(todayStart.getDate() + 2);

  const weekEnd = new Date(todayStart);
  weekEnd.setDate(todayStart.getDate() + 7);

  return rows.filter((row) => {
    if (!row.event.eventDate) {
      return false;
    }

    const eventDate = new Date(row.event.eventDate);

    if (Number.isNaN(eventDate.getTime())) {
      return false;
    }

    if (dateFilter === "today") {
      return eventDate >= todayStart && eventDate < tomorrowStart;
    }

    if (dateFilter === "tomorrow") {
      return eventDate >= tomorrowStart && eventDate < dayAfterTomorrowStart;
    }

    return eventDate >= todayStart && eventDate <= weekEnd;
  });
}

function getManagerActionItems(rows: EventDashboardRow[]): ManagerActionItem[] {
  const items: ManagerActionItem[] = [];

  rows.forEach((row) => {
    const prepNotStarted = getPrepNotStartedCount(row.menuLines);
    const prepBlocked = getPrepBlockedCount(row.menuLines);
    const packetReady = row.menuLines.length > 0;

    if (row.staffSummary.blocked > 0 || prepBlocked > 0) {
      items.push({
        id: `${row.event.id}-blocked`,
        eventId: row.event.id,
        eventTitle: row.event.title,
        type: "BLOCKED",
        title: "Blocked task",
        message: `${row.staffSummary.blocked + prepBlocked} item needs manager attention before work can continue.`,
        severity: "high",
      });
    }

    if (row.staffSummary.needsHelp > 0) {
      items.push({
        id: `${row.event.id}-needs-help`,
        eventId: row.event.id,
        eventTitle: row.event.title,
        type: "NEEDS_HELP",
        title: "Staff needs help",
        message: `${row.staffSummary.needsHelp} staff confirmation needs help.`,
        severity: "high",
      });
    }

    if (row.staffSummary.pending > 0) {
      items.push({
        id: `${row.event.id}-unconfirmed-staff`,
        eventId: row.event.id,
        eventTitle: row.event.title,
        type: "UNCONFIRMED_STAFF",
        title: "Unconfirmed staff",
        message: `${row.staffSummary.pending} staff confirmation still pending.`,
        severity: "medium",
      });
    }

    if (prepNotStarted > 0) {
      items.push({
        id: `${row.event.id}-prep-not-started`,
        eventId: row.event.id,
        eventTitle: row.event.title,
        type: "PREP_NOT_STARTED",
        title: "Prep not started",
        message: `${prepNotStarted} menu item${
          prepNotStarted === 1 ? "" : "s"
        } not started.`,
        severity: "medium",
      });
    }

    if (row.margin > 0 && row.margin < 35) {
      items.push({
        id: `${row.event.id}-low-margin`,
        eventId: row.event.id,
        eventTitle: row.event.title,
        type: "LOW_MARGIN",
        title: "Low margin event",
        message: `Margin is ${formatPercent(
          row.margin,
        )}. Review price, food cost, labor, packaging, or delivery.`,
        severity: "high",
      });
    }

    if (packetReady && row.staffSummary.blocked === 0 && prepBlocked === 0) {
      items.push({
        id: `${row.event.id}-packet-ready`,
        eventId: row.event.id,
        eventTitle: row.event.title,
        type: "PACKET_READY",
        title: "Kitchen packet ready",
        message: `${row.menuLines.length} menu item${
          row.menuLines.length === 1 ? "" : "s"
        } ready for kitchen review.`,
        severity: "good",
      });
    }
  });

  return items.sort((firstItem, secondItem) => {
    const order = {
      high: 1,
      medium: 2,
      low: 3,
      good: 4,
    };

    return order[firstItem.severity] - order[secondItem.severity];
  });
}

function getSeverityClass(severity: ManagerActionItem["severity"]): string {
  if (severity === "high") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (severity === "medium") {
    return "border-yellow-200 bg-yellow-50 text-yellow-800";
  }

  if (severity === "good") {
    return "border-green-200 bg-green-50 text-green-800";
  }

  return "border-[#eadfce] bg-[#fbf7ef] text-[#111827]";
}

function getBadgeClass(type: ManagerActionType): string {
  if (type === "BLOCKED" || type === "LOW_MARGIN") {
    return "bg-red-700 text-white";
  }

  if (type === "NEEDS_HELP" || type === "UNCONFIRMED_STAFF") {
    return "bg-yellow-50 text-yellow-700";
  }

  if (type === "PACKET_READY") {
    return "bg-green-700 text-white";
  }

  return "bg-white text-[#6b7280]";
}

export default function KitchenDashboardPage() {
  const [rows, setRows] = useState<EventDashboardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [stationFilter, setStationFilter] = useState<StationFilter>("all");
  const [prepStatusFilter, setPrepStatusFilter] =
    useState<PrepStatusFilter>("all");

  const dateFilteredRows = useMemo(() => {
    return getFilteredRows(rows, dateFilter);
  }, [rows, dateFilter]);

  const stationFilteredRows = useMemo(() => {
    if (stationFilter === "all") {
      return dateFilteredRows;
    }

    return dateFilteredRows
      .map((row: EventDashboardRow) => {
        const stationMenuLines = row.menuLines.filter(
          (line: EventMenuLine) => line.station === stationFilter,
        );

        return {
          ...row,
          menuLines: stationMenuLines,
        };
      })
      .filter((row: EventDashboardRow) => row.menuLines.length > 0);
  }, [dateFilteredRows, stationFilter]);

  const filteredRows = useMemo(() => {
    if (prepStatusFilter === "all") {
      return stationFilteredRows;
    }

    return stationFilteredRows
      .map((row: EventDashboardRow) => {
        const statusMenuLines = row.menuLines.filter(
          (line: EventMenuLine) =>
            line.prepStatus.toLowerCase() === prepStatusFilter.toLowerCase(),
        );

        return {
          ...row,
          menuLines: statusMenuLines,
        };
      })
      .filter((row: EventDashboardRow) => row.menuLines.length > 0);
  }, [stationFilteredRows, prepStatusFilter]);

  const managerActionItems = useMemo(() => {
    return getManagerActionItems(filteredRows);
  }, [filteredRows]);

  const totals = useMemo(() => {
    const eventCount = filteredRows.length;
    const packetReadyCount = filteredRows.filter(
      (row: EventDashboardRow) => row.menuLines.length > 0,
    ).length;
    const unconfirmedCount = filteredRows.reduce(
      (sum: number, row: EventDashboardRow) => sum + row.staffSummary.pending,
      0,
    );
    const needsHelpCount = filteredRows.reduce(
      (sum: number, row: EventDashboardRow) => sum + row.staffSummary.needsHelp,
      0,
    );
    const blockedCount = filteredRows.reduce(
      (sum: number, row: EventDashboardRow) =>
        sum + row.staffSummary.blocked + getPrepBlockedCount(row.menuLines),
      0,
    );
    const lowMarginCount = filteredRows.filter(
      (row: EventDashboardRow) => row.margin > 0 && row.margin < 35,
    ).length;
    const prepNotStartedCount = filteredRows.reduce(
      (sum: number, row: EventDashboardRow) =>
        sum + getPrepNotStartedCount(row.menuLines),
      0,
    );
    const prepInProgressCount = filteredRows.reduce(
      (sum: number, row: EventDashboardRow) =>
        sum + getPrepInProgressCount(row.menuLines),
      0,
    );
    const prepCompletedCount = filteredRows.reduce(
      (sum: number, row: EventDashboardRow) =>
        sum + getPrepCompletedCount(row.menuLines),
      0,
    );

    return {
      eventCount,
      packetReadyCount,
      unconfirmedCount,
      needsHelpCount,
      blockedCount,
      lowMarginCount,
      prepNotStartedCount,
      prepInProgressCount,
      prepCompletedCount,
      managerActionCount: managerActionItems.filter(
        (item: ManagerActionItem) => item.severity !== "good",
      ).length,
    };
  }, [filteredRows, managerActionItems]);

  async function handlePrepStatusUpdate(
    eventId: string,
    lineId: string,
    prepStatus: PrepStatusFilter,
  ): Promise<void> {
    if (prepStatus === "all") {
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/recipe-lines/prep-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lineId,
            prepStatus,
          }),
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to update prep status.");
      }

      setRows((currentRows: EventDashboardRow[]) =>
        currentRows.map((row: EventDashboardRow) =>
          row.event.id === eventId
            ? {
                ...row,
                menuLines: row.menuLines.map((line: EventMenuLine) =>
                  line.id === lineId
                    ? {
                        ...line,
                        prepStatus,
                      }
                    : line,
                ),
              }
            : row,
        ),
      );
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong updating prep status.";

      setError(message);
    }
  }

  async function handleStationUpdate(
    eventId: string,
    lineId: string,
    station: StationFilter,
  ): Promise<void> {
    if (station === "all") {
      return;
    }

    setError("");
    setStationFilter(station);

    try {
      const response = await fetch(
        `/api/events/${eventId}/recipe-lines/station`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lineId,
            station,
          }),
        },
      );

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to update station.");
      }

      setRows((currentRows: EventDashboardRow[]) =>
        currentRows.map((row: EventDashboardRow) =>
          row.event.id === eventId
            ? {
                ...row,
                menuLines: row.menuLines.map((line: EventMenuLine) =>
                  line.id === lineId
                    ? {
                        ...line,
                        station,
                      }
                    : line,
                ),
              }
            : row,
        ),
      );
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong updating station.";

      setError(message);
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  async function loadKitchenDashboard(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const eventsResponse = await fetch("/api/events", {
        cache: "no-store",
      });

      const eventsData = (await eventsResponse.json()) as EventsResponse;

      if (!eventsResponse.ok || eventsData.success === false) {
        throw new Error(eventsData.error ?? "Failed to load events.");
      }

      const eventSource = Array.isArray(eventsData.events)
        ? eventsData.events
        : Array.isArray(eventsData.data)
          ? eventsData.data
          : [];

      const normalizedEvents = eventSource
        .map((event: unknown) => normalizeEvent(event))
        .filter((event): event is KitchenEvent => event !== null)
        .slice(0, 25);

      const dashboardRows = await Promise.all(
        normalizedEvents.map(async (event: KitchenEvent) => {
          const [recipeLinesResponse, staffResponse] = await Promise.all([
            fetch(`/api/events/${event.id}/recipe-lines`, {
              cache: "no-store",
            }),
            fetch(`/api/events/${event.id}/staff-confirmations`, {
              cache: "no-store",
            }),
          ]);

          const recipeLinesData =
            (await recipeLinesResponse.json()) as RecipeLinesResponse;
          const staffData =
            (await staffResponse.json()) as StaffConfirmationsResponse;

          const lineSource = Array.isArray(recipeLinesData.lines)
            ? recipeLinesData.lines
            : Array.isArray(recipeLinesData.data)
              ? recipeLinesData.data
              : [];

          const menuLines = lineSource
            .map((line: unknown) => normalizeMenuLine(line))
            .filter((line): line is EventMenuLine => line !== null);

          const confirmationSource = Array.isArray(staffData.confirmations)
            ? staffData.confirmations
            : [];

          const confirmations = confirmationSource
            .map((confirmation: unknown) =>
              normalizeStaffConfirmation(confirmation),
            )
            .filter(
              (confirmation): confirmation is StaffConfirmation =>
                confirmation !== null,
            );

          const staffSummary = normalizeStaffSummary(staffData.summary);
          const eventProfit = readEventProfit(recipeLinesData.eventProfit);

          return {
            event,
            menuLines,
            staffSummary,
            confirmations,
            foodCost: eventProfit.foodCost,
            revenue: eventProfit.revenue,
            margin: eventProfit.margin,
          };
        }),
      );

      setRows(dashboardRows);
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading kitchen dashboard.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKitchenDashboard();
  }, []);

  return (
    <main
      suppressHydrationWarning
      className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#a05a2c]">
                Kitchen Command Center
              </p>

              <h1 className="mt-2 text-3xl font-bold text-[#1f2937]">
                Today&apos;s Kitchen Dashboard
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-[#6b7280]">
                Manager action queue for prep, packets, staff confirmations,
                blocked tasks, and low-margin events.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-sm"
              >
                Events
              </Link>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => void loadKitchenDashboard()}
                disabled={loading}
                className="rounded-2xl bg-[#1f2937] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              Loading kitchen dashboard...
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-[#111827]">
                Kitchen Date Filter
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                Filter the kitchen board by event date.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {dateFilterOptions.map((option) => (
                <button
                  key={option.key}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => setDateFilter(option.key)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm ${
                    dateFilter === option.key
                      ? "bg-[#1f2937] text-white"
                      : "border border-[#eadfce] bg-white text-[#111827]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-[#111827]">
                Station Filter
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                Filter the kitchen board by station assignment.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {stationFilterOptions.map((option) => (
                <button
                  key={option.key}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => setStationFilter(option.key)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm ${
                    stationFilter === option.key
                      ? "bg-[#1f2937] text-white"
                      : "border border-[#eadfce] bg-white text-[#111827]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold text-[#111827]">
                Prep Status Filter
              </p>
              <p className="mt-1 text-sm text-[#6b7280]">
                Filter the kitchen board by prep progress.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {prepStatusFilterOptions.map((option) => (
                <button
                  key={option.key}
                  suppressHydrationWarning
                  type="button"
                  onClick={() => setPrepStatusFilter(option.key)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm ${
                    prepStatusFilter === option.key
                      ? "bg-[#1f2937] text-white"
                      : "border border-[#eadfce] bg-white text-[#111827]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Filtered Events
            </p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {totals.eventCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Packets Ready
            </p>
            <p className="mt-3 text-3xl font-bold text-green-700">
              {totals.packetReadyCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Manager Actions
            </p>
            <p className="mt-3 text-3xl font-bold text-red-700">
              {totals.managerActionCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Blocked Tasks
            </p>
            <p className="mt-3 text-3xl font-bold text-red-700">
              {totals.blockedCount}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Unconfirmed Staff
            </p>
            <p className="mt-3 text-3xl font-bold text-yellow-700">
              {totals.unconfirmedCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">Needs Help</p>
            <p className="mt-3 text-3xl font-bold text-yellow-700">
              {totals.needsHelpCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Prep Not Started
            </p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {totals.prepNotStartedCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Low Margin Events
            </p>
            <p className="mt-3 text-3xl font-bold text-red-700">
              {totals.lowMarginCount}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Prep In Progress
            </p>
            <p className="mt-3 text-3xl font-bold text-yellow-700">
              {totals.prepInProgressCount}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Prep Completed
            </p>
            <p className="mt-3 text-3xl font-bold text-green-700">
              {totals.prepCompletedCount}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                Manager Action Queue
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Priority queue for blocked work, staff needing help, prep not
                started, unconfirmed staff, and low-margin events.
              </p>
            </div>
          </div>

          {managerActionItems.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {managerActionItems.map((item: ManagerActionItem) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 ${getSeverityClass(
                    item.severity,
                  )}`}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(
                            item.type,
                          )}`}
                        >
                          {item.type.replaceAll("_", " ")}
                        </span>

                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {item.severity} priority
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold">
                        {item.title}: {item.eventTitle}
                      </h3>

                      <p className="mt-1 text-sm">{item.message}</p>
                    </div>

                    <Link
                      href={`/events/${item.eventId}/kitchen-packet`}
                      className="rounded-xl bg-[#1f2937] px-4 py-3 text-center text-sm font-semibold text-white"
                    >
                      Open Packet
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              No urgent manager action items right now.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                Event Kitchen Board
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Manager view of packets, prep status, confirmations, and margin
                risk.
              </p>
            </div>
          </div>

          {filteredRows.length > 0 ? (
            <div className="mt-5 grid gap-4">
              {filteredRows.map((row: EventDashboardRow) => {
                const hasLowMargin = row.margin > 0 && row.margin < 35;
                const hasBlocked =
                  row.staffSummary.blocked > 0 ||
                  getPrepBlockedCount(row.menuLines) > 0;
                const hasNeedsHelp = row.staffSummary.needsHelp > 0;
                const packetReady = row.menuLines.length > 0;
                const prepNotStarted = getPrepNotStartedCount(row.menuLines);
                const prepCompleted = getPrepCompletedCount(row.menuLines);
                const prepInProgress = getPrepInProgressCount(row.menuLines);

                return (
                  <div
                    key={row.event.id}
                    className="rounded-3xl border border-[#eadfce] bg-[#fbf7ef] p-4"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6b7280]">
                            {row.event.status}
                          </span>

                          {packetReady ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              Packet Ready
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                              Packet Not Ready
                            </span>
                          )}

                          {prepNotStarted > 0 ? (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#6b7280]">
                              Prep Not Started: {prepNotStarted}
                            </span>
                          ) : null}

                          {hasLowMargin ? (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Low Margin
                            </span>
                          ) : null}

                          {hasBlocked ? (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Blocked
                            </span>
                          ) : null}

                          {hasNeedsHelp ? (
                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                              Needs Help
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 text-lg font-bold text-[#111827]">
                          {row.event.title}
                        </h3>

                        <p className="mt-1 text-sm text-[#6b7280]">
                          {row.event.customerName} ·{" "}
                          {formatEventDate(row.event.eventDate)} · Guests:{" "}
                          {row.event.guestCount}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 lg:min-w-[520px]">
                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-semibold text-[#6b7280]">
                            Menu Items
                          </p>
                          <p className="mt-1 text-xl font-bold text-[#111827]">
                            {row.menuLines.length}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-semibold text-[#6b7280]">
                            Confirmed
                          </p>
                          <p className="mt-1 text-xl font-bold text-green-700">
                            {row.staffSummary.confirmed}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-semibold text-[#6b7280]">
                            Pending
                          </p>
                          <p className="mt-1 text-xl font-bold text-yellow-700">
                            {row.staffSummary.pending}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white p-3">
                          <p className="font-semibold text-[#6b7280]">
                            Margin
                          </p>
                          <p
                            className={`mt-1 text-xl font-bold ${
                              hasLowMargin ? "text-red-700" : "text-green-700"
                            }`}
                          >
                            {row.margin > 0 ? formatPercent(row.margin) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl bg-white p-4">
                        <p className="font-bold text-[#111827]">Prep Status</p>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Not Started
                            </p>
                            <p className="text-lg font-bold text-[#111827]">
                              {prepNotStarted}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              In Progress
                            </p>
                            <p className="text-lg font-bold text-yellow-700">
                              {prepInProgress}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Completed
                            </p>
                            <p className="text-lg font-bold text-green-700">
                              {prepCompleted}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {row.menuLines.length > 0 ? (
                            row.menuLines.map((line: EventMenuLine) => ( // CHANGED
                             <div
                               key={line.id}
                               className="grid gap-2 rounded-xl bg-[#fbf7ef] px-3 py-2 text-sm md:grid-cols-[1.5fr_1fr_1fr]"
                              >
                                
                                  <span className="font-semibold text-[#111827]">
                                    {line.recipeName}
                                  </span>

                                  <select
                                    suppressHydrationWarning
                                    value={line.station}
                                    onChange={(event) =>
                                      void handleStationUpdate(
                                        row.event.id,
                                        line.id,
                                        event.target.value as StationFilter,
                                      )
                                    }
                                    className="rounded-full border border-[#eadfce] bg-white px-2 py-1 text-xs font-semibold text-[#111827]"
                                  >
                                    {stationAssignmentOptions.map((option) => (
                                      <option
                                        key={option.key}
                                        value={option.key}
                                      >
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>

                                  <select
                                    suppressHydrationWarning
                                    value={line.prepStatus}
                                    onChange={(event) =>
                                      void handlePrepStatusUpdate(
                                        row.event.id,
                                        line.id,
                                        event.target.value as PrepStatusFilter,
                                      )
                                    }
                                    className="rounded-full border border-[#eadfce] bg-white px-2 py-1 text-xs font-semibold text-[#111827]"
                                  >
                                    <option value="Not Started">
                                      Not Started
                                    </option>
                                    <option value="In Progress">
                                      In Progress
                                    </option>
                                    <option value="Completed">Completed</option>
                                    <option value="Blocked">Blocked</option>
                                  </select>
                                </div>
                              ))
                          ) : (
                            <p className="text-sm text-[#6b7280]">
                              No menu lines yet.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="font-bold text-[#111827]">
                          Staff Confirmation
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Total
                            </p>
                            <p className="text-lg font-bold text-[#111827]">
                              {row.staffSummary.total}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Confirmed
                            </p>
                            <p className="text-lg font-bold text-green-700">
                              {row.staffSummary.confirmed}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Needs Help
                            </p>
                            <p className="text-lg font-bold text-yellow-700">
                              {row.staffSummary.needsHelp}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Blocked
                            </p>
                            <p className="text-lg font-bold text-red-700">
                              {row.staffSummary.blocked}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#fbf7ef] px-3 py-2">
                            <p className="font-semibold text-[#6b7280]">
                              Pending
                            </p>
                            <p className="text-lg font-bold text-[#111827]">
                              {row.staffSummary.pending}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-4">
                        <p className="font-bold text-[#111827]">Actions</p>

                        <div className="mt-3 flex flex-col gap-2">
                          <Link
                            href={`/events/${row.event.id}/kitchen-packet`}
                            className="rounded-xl bg-[#1f2937] px-4 py-3 text-center text-sm font-semibold text-white"
                          >
                            Open Kitchen Packet
                          </Link>

                          <Link
                            href={`/events/${row.event.id}`}
                            className="rounded-xl border border-[#eadfce] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827]"
                          >
                            Open Event Menu
                          </Link>
                        </div>

                        <div className="mt-4 rounded-xl bg-[#fbf7ef] px-3 py-2 text-sm text-[#111827]">
                          <p>
                            <span className="font-semibold">Revenue:</span>{" "}
                            {formatCurrency(row.revenue)}
                          </p>
                          <p>
                            <span className="font-semibold">Food Cost:</span>{" "}
                            {formatCurrency(row.foodCost)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No kitchen events found for this filter.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}