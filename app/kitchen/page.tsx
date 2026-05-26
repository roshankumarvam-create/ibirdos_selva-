"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

type EventStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "APPROVAL_REQUIRED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

type KitchenEvent = {
  id: string;
  title: string;
  customerName: string;
  eventDate: string | null;
  status: EventStatus;
  guestCount: number;
};

type KitchenLine = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string | null;
  recipeName: string;
  category: string;
  customerPortions: number;
  prepPortions: number;
  recipeYield: number;
  batchCount: number;
  roundedBatchCount: number;
  station: string;
  prepStatus: PrepStatus;
};

type StaffSummary = {
  total: number;
  pending: number;
  confirmed: number;
  needsHelp: number;
  blocked: number;
};

type KitchenCard = {
  event: KitchenEvent;
  lines: KitchenLine[];
  staffSummary: StaffSummary;
  tempLogCount: number;
  packagingLogCount: number;
  deliveryLogCount: number;
};

type EventsResponse = {
  success?: boolean;
  events?: unknown[];
  data?: unknown[];
  error?: string;
};

type EventLinesResponse = {
  success?: boolean;
  lines?: unknown[];
  data?: unknown[];
  error?: string;
};

type StaffConfirmationsResponse = {
  success?: boolean;
  summary?: unknown;
  error?: string;
};

type KitchenPacketLogsResponse = {
  success?: boolean;
  logs?: unknown[];
  data?: unknown[];
  error?: string;
};

const stationSortOrder = [
  "Hot Station",
  "Cold Station",
  "Grill Station",
  "Fry Station",
  "Prep Station",
  "Bakery Station",
  "Packing Station",
  "Delivery Station",
  "Unassigned",
];

const prepStatusOptions: Array<PrepStatus | "All"> = [
  "All",
  "Not Started",
  "In Progress",
  "Completed",
  "Blocked",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function readEventStatus(value: unknown): EventStatus {
  const status = readString(value, "UNKNOWN").toUpperCase();

  if (
    status === "DRAFT" ||
    status === "CONFIRMED" ||
    status === "APPROVAL_REQUIRED" ||
    status === "COMPLETED" ||
    status === "CANCELLED"
  ) {
    return status;
  }

  return "UNKNOWN";
}

function readPrepStatus(value: unknown): PrepStatus {
  if (
    value === "Not Started" ||
    value === "In Progress" ||
    value === "Completed" ||
    value === "Blocked"
  ) {
    return value;
  }

  return "Not Started";
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
      value.eventDate ??
        value.event_date ??
        value.date ??
        value.deliveryDate ??
        value.delivery_date,
    ),
    status: readEventStatus(value.status),
    guestCount: readNumber(
      value.guestCount ?? value.guest_count ?? value.guests,
      0,
    ),
  };
}

function normalizeKitchenLine(
  value: unknown,
  event: KitchenEvent,
): KitchenLine | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  const prepPortions = readNumber(
    value.prepPortions ??
      value.prep_portions ??
      value.kitchenPrepPortions ??
      value.kitchen_prep_portions,
    0,
  );

  const recipeYield =
    readNumber(
      value.recipeYield ??
        value.recipe_yield ??
        value.yield ??
        value.servings,
      1,
    ) || 1;

  const safeYield = recipeYield > 0 ? recipeYield : 1;

  const batchCount =
    readNumber(value.batchCount ?? value.batch_count, 0) ||
    prepPortions / safeYield;

  const roundedBatchCount =
    readNumber(value.roundedBatchCount ?? value.rounded_batch_count, 0) ||
    readNumber(value.kitchenBatches ?? value.kitchen_batches, 0) ||
    Math.ceil(batchCount);

  return {
    id,
    eventId: event.id,
    eventTitle: event.title,
    eventDate: event.eventDate,
    recipeName: readString(
      value.recipeName ?? value.recipe_name ?? value.name,
      "Unnamed Recipe",
    ),
    category: readString(
      value.category ?? value.recipeCategory ?? value.recipe_category,
      "Other",
    ),
    customerPortions: readNumber(
      value.customerPortions ?? value.customer_portions,
      0,
    ),
    prepPortions,
    recipeYield: safeYield,
    batchCount,
    roundedBatchCount,
    station: readString(
      value.station ?? value.prepStation ?? value.prep_station,
      "Unassigned",
    ),
    prepStatus: readPrepStatus(
      value.prepStatus ?? value.prep_status ?? value.status,
    ),
  };
}

function normalizeStaffSummary(value: unknown): StaffSummary {
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

function getPrepStatusClass(status: PrepStatus): string {
  if (status === "Completed") {
    return "bg-green-700 text-white";
  }

  if (status === "In Progress") {
    return "bg-yellow-600 text-white";
  }

  if (status === "Blocked") {
    return "bg-red-700 text-white";
  }

  return "bg-white text-[#111827]";
}

function getEventStatusClass(status: EventStatus): string {
  if (status === "CONFIRMED") {
    return "bg-green-50 text-green-700";
  }

  if (status === "APPROVAL_REQUIRED") {
    return "bg-yellow-50 text-yellow-800";
  }

  if (status === "COMPLETED") {
    return "bg-blue-50 text-blue-700";
  }

  if (status === "CANCELLED") {
    return "bg-red-50 text-red-700";
  }

  return "bg-gray-100 text-[#111827]";
}

export default function KitchenDashboardPage() {
  const [cards, setCards] = useState<KitchenCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedStation, setSelectedStation] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<PrepStatus | "All">(
    "All",
  );
  const [searchTerm, setSearchTerm] = useState<string>("");

  const allLines = useMemo(() => {
    return cards.flatMap((card) => card.lines);
  }, [cards]);

  const stationOptions = useMemo(() => {
    const stations = Array.from(
      new Set(allLines.map((line) => line.station || "Unassigned")),
    );

    return [
      "All",
      ...stations.sort((firstStation, secondStation) => {
        const firstIndex = stationSortOrder.indexOf(firstStation);
        const secondIndex = stationSortOrder.indexOf(secondStation);

        if (firstIndex === -1 && secondIndex === -1) {
          return firstStation.localeCompare(secondStation);
        }

        if (firstIndex === -1) {
          return 1;
        }

        if (secondIndex === -1) {
          return -1;
        }

        return firstIndex - secondIndex;
      }),
    ];
  }, [allLines]);

  const filteredLines = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return allLines.filter((line) => {
      const matchesStation =
        selectedStation === "All" || line.station === selectedStation;

      const matchesStatus =
        selectedStatus === "All" || line.prepStatus === selectedStatus;

      const matchesSearch =
        cleanSearch.length === 0 ||
        line.recipeName.toLowerCase().includes(cleanSearch) ||
        line.eventTitle.toLowerCase().includes(cleanSearch) ||
        line.station.toLowerCase().includes(cleanSearch);

      return matchesStation && matchesStatus && matchesSearch;
    });
  }, [allLines, selectedStation, selectedStatus, searchTerm]);

  const totalEvents = cards.length;
  const totalPrepItems = allLines.length;
  const completedItems = allLines.filter(
    (line) => line.prepStatus === "Completed",
  ).length;
  const inProgressItems = allLines.filter(
    (line) => line.prepStatus === "In Progress",
  ).length;
  const blockedItems = allLines.filter(
    (line) => line.prepStatus === "Blocked",
  ).length;
  const notStartedItems = allLines.filter(
    (line) => line.prepStatus === "Not Started",
  ).length;

  const totalStaffConfirmed = cards.reduce(
    (sum, card) => sum + card.staffSummary.confirmed,
    0,
  );

  const totalStaffPending = cards.reduce(
    (sum, card) => sum + card.staffSummary.pending,
    0,
  );

  const totalTempLogs = cards.reduce((sum, card) => sum + card.tempLogCount, 0);

  async function fetchKitchenCard(event: KitchenEvent): Promise<KitchenCard> {
    const [linesResponse, staffResponse, logsResponse] = await Promise.all([
      fetch(`/api/events/${event.id}/recipe-lines`, {
        cache: "no-store",
      }),
      fetch(`/api/events/${event.id}/staff-confirmations`, {
        cache: "no-store",
      }),
      fetch(`/api/events/${event.id}/kitchen-packet-logs`, {
        cache: "no-store",
      }),
    ]);

    const linesData = (await linesResponse.json()) as EventLinesResponse;
    const staffData = (await staffResponse.json()) as StaffConfirmationsResponse;
    const logsData = (await logsResponse.json()) as KitchenPacketLogsResponse;

    const lineSource = Array.isArray(linesData.lines)
      ? linesData.lines
      : Array.isArray(linesData.data)
        ? linesData.data
        : [];

    const normalizedLines = lineSource
      .map((line) => normalizeKitchenLine(line, event))
      .filter((line): line is KitchenLine => line !== null);

    const logSource = Array.isArray(logsData.logs)
      ? logsData.logs
      : Array.isArray(logsData.data)
        ? logsData.data
        : [];

    const logs = logSource.filter((log): log is Record<string, unknown> =>
      isRecord(log),
    );

    const tempLogCount = logs.filter(
      (log) =>
        readString(log.checklistType ?? log.checklist_type, "") ===
        "TEMPERATURE_LOG",
    ).length;

    const packagingLogCount = logs.filter(
      (log) =>
        readString(log.checklistType ?? log.checklist_type, "") ===
        "PACKAGING",
    ).length;

    const deliveryLogCount = logs.filter(
      (log) =>
        readString(log.checklistType ?? log.checklist_type, "") ===
        "DELIVERY_TRANSFER",
    ).length;

    return {
      event,
      lines: normalizedLines,
      staffSummary: normalizeStaffSummary(staffData.summary),
      tempLogCount,
      packagingLogCount,
      deliveryLogCount,
    };
  }

  async function loadKitchenDashboard(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/events", {
        cache: "no-store",
      });

      const data = (await response.json()) as EventsResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Failed to load events.");
      }

      const source = Array.isArray(data.events)
        ? data.events
        : Array.isArray(data.data)
          ? data.data
          : [];

      const normalizedEvents = source
        .map((event) => normalizeEvent(event))
        .filter((event): event is KitchenEvent => event !== null);

      const activeEvents = normalizedEvents.filter(
        (event) => event.status !== "CANCELLED" && event.status !== "COMPLETED",
      );

      const kitchenCards = await Promise.all(
        activeEvents.map((event) => fetchKitchenCard(event)),
      );

      setCards(kitchenCards);
    } catch (caughtError) {
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
      className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#a05a2c]">
                Kitchen Command Center
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#111827] md:text-5xl">
                Chef Prep Dashboard
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-[#64748b]">
                See all event prep items by station, status, staff confirmation,
                temperature logs, packaging, and delivery readiness.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-bold text-[#111827]"
              >
                Dashboard
              </Link>

              <Link
                href="/events"
                className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-bold text-[#111827]"
              >
                Events
              </Link>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => void loadKitchenDashboard()}
                className="rounded-2xl bg-[#003c24] px-5 py-3 text-sm font-bold text-white"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <p className="mt-5 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm font-semibold text-[#64748b]">
              Loading kitchen dashboard...
            </p>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Active Events</p>
            <p className="mt-3 text-4xl font-black text-[#111827]">
              {totalEvents}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Prep Items</p>
            <p className="mt-3 text-4xl font-black text-[#111827]">
              {totalPrepItems}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Completed</p>
            <p className="mt-3 text-4xl font-black text-green-700">
              {completedItems}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Blocked</p>
            <p className="mt-3 text-4xl font-black text-red-700">
              {blockedItems}
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">In Progress</p>
            <p className="mt-3 text-3xl font-black text-yellow-700">
              {inProgressItems}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Not Started</p>
            <p className="mt-3 text-3xl font-black text-[#111827]">
              {notStartedItems}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Staff Confirmed</p>
            <p className="mt-3 text-3xl font-black text-green-700">
              {totalStaffConfirmed}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Staff Pending</p>
            <p className="mt-3 text-3xl font-black text-yellow-700">
              {totalStaffPending}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Temp Logs</p>
            <p className="mt-3 text-3xl font-black text-[#111827]">
              {totalTempLogs}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#8a633b]">
                Search
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search recipe, event, station..."
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#8a633b]">
                Station
              </span>
              <select
                suppressHydrationWarning
                value={selectedStation}
                onChange={(event) => setSelectedStation(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
              >
                {stationOptions.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#8a633b]">
                Prep Status
              </span>
              <select
                suppressHydrationWarning
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(event.target.value as PrepStatus | "All")
                }
                className="mt-2 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
              >
                {prepStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#a05a2c]">
                Prep Board
              </p>

              <h2 className="mt-1 text-2xl font-black text-[#111827]">
                Station Work Queue
              </h2>
            </div>

            <div className="rounded-2xl bg-[#fbf7ef] px-5 py-3 text-sm font-bold text-[#111827]">
              Showing {filteredLines.length} of {allLines.length}
            </div>
          </div>

          {filteredLines.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[1200px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#64748b]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Event</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Recipe</th>
                    <th className="px-4 py-3 font-bold">Station</th>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Prep</th>
                    <th className="px-4 py-3 font-bold">Yield</th>
                    <th className="px-4 py-3 font-bold">Batches</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Packet</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLines.map((line) => (
                    <tr key={line.id} className="border-t border-[#eadfce]">
                      <td className="px-4 py-3 font-black text-[#111827]">
                        {line.eventTitle}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {formatEventDate(line.eventDate)}
                      </td>

                      <td className="px-4 py-3 font-black text-[#111827]">
                        {line.recipeName}
                        <span className="block text-xs font-semibold text-[#64748b]">
                          {line.category}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.station}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.customerPortions}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.prepPortions}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.recipeYield}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.roundedBatchCount}
                        <span className="block text-xs text-[#64748b]">
                          exact {line.batchCount.toFixed(2)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-xl px-3 py-2 text-xs font-bold ${getPrepStatusClass(
                            line.prepStatus,
                          )}`}
                        >
                          {line.prepStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <Link
                          href={`/events/${line.eventId}/kitchen-packet`}
                          className="rounded-xl bg-[#111827] px-3 py-2 text-xs font-bold text-white"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#64748b]">
              No prep items match this filter.
            </p>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {cards.map((card) => {
            const completedCount = card.lines.filter(
              (line) => line.prepStatus === "Completed",
            ).length;

            const blockedCount = card.lines.filter(
              (line) => line.prepStatus === "Blocked",
            ).length;

            return (
              <div
                key={card.event.id}
                className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#a05a2c]">
                      Event
                    </p>

                    <h3 className="mt-1 text-xl font-black text-[#111827]">
                      {card.event.title}
                    </h3>

                    <p className="mt-1 text-sm text-[#64748b]">
                      {formatEventDate(card.event.eventDate)} · Guests{" "}
                      {card.event.guestCount}
                    </p>
                  </div>

                  <span
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${getEventStatusClass(
                      card.event.status,
                    )}`}
                  >
                    {card.event.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-[#fbf7ef] p-3">
                    <p className="text-xs font-bold text-[#64748b]">Items</p>
                    <p className="mt-1 text-2xl font-black text-[#111827]">
                      {card.lines.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fbf7ef] p-3">
                    <p className="text-xs font-bold text-[#64748b]">
                      Completed
                    </p>
                    <p className="mt-1 text-2xl font-black text-green-700">
                      {completedCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fbf7ef] p-3">
                    <p className="text-xs font-bold text-[#64748b]">Blocked</p>
                    <p className="mt-1 text-2xl font-black text-red-700">
                      {blockedCount}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fbf7ef] p-3">
                    <p className="text-xs font-bold text-[#64748b]">
                      Temp Logs
                    </p>
                    <p className="mt-1 text-2xl font-black text-[#111827]">
                      {card.tempLogCount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[#eadfce] p-3">
                    <p className="text-xs font-bold text-[#64748b]">
                      Staff Confirmed
                    </p>
                    <p className="mt-1 text-xl font-black text-green-700">
                      {card.staffSummary.confirmed}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] p-3">
                    <p className="text-xs font-bold text-[#64748b]">
                      Packaging Logs
                    </p>
                    <p className="mt-1 text-xl font-black text-[#111827]">
                      {card.packagingLogCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#eadfce] p-3">
                    <p className="text-xs font-bold text-[#64748b]">
                      Delivery Logs
                    </p>
                    <p className="mt-1 text-xl font-black text-[#111827]">
                      {card.deliveryLogCount}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/events/${card.event.id}`}
                    className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm font-bold text-[#111827]"
                  >
                    Event Menu
                  </Link>

                  <Link
                    href={`/events/${card.event.id}/kitchen-packet`}
                    className="rounded-2xl bg-[#111827] px-4 py-3 text-sm font-bold text-white"
                  >
                    Open Kitchen Packet
                  </Link>
                </div>
              </div>
            );
          })}

          {!loading && cards.length === 0 ? (
            <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm md:col-span-2">
              <h3 className="text-xl font-black text-[#111827]">
                No active kitchen events yet
              </h3>

              <p className="mt-2 text-sm text-[#64748b]">
                Create an event, add recipes to the event menu, then return to
                this Kitchen dashboard.
              </p>

              <Link
                href="/events"
                className="mt-5 inline-flex rounded-2xl bg-[#003c24] px-5 py-3 text-sm font-bold text-white"
              >
                Go To Events
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}