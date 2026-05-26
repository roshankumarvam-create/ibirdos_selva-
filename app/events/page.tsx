"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "INVOICED"
  | "PAID"
  | "QUOTED";

type ViewMode = "list" | "calendar";

type CateringEvent = {
  id: string;
  name: string;
  event_name?: string;
  event_date: string | null;
  guest_count: number | string | null;
  status: EventStatus;
  menu_id: string | null;
  service_type: string | null;
  total_cost: string | number | null;
  revenue: string | number | null;
  food_cost: string | number | null;
  margin: string | number | null;
  created_at: string | null;
};

type EventsApiResponse = {
  success: boolean;
  events?: CateringEvent[];
  data?: CateringEvent[];
  error?: string;
};

type CreateEventResponse = {
  success: boolean;
  event?: CateringEvent;
  data?: CateringEvent;
  error?: string;
};

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatCurrency(value: string | number | null | undefined): string {
  return `$${toNumber(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: string | number | null | undefined): string {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusClass(status: EventStatus | string): string {
  if (status === "APPROVED" || status === "CONFIRMED" || status === "PAID") {
    return "bg-green-100 text-green-800";
  }

  if (status === "PENDING_APPROVAL" || status === "QUOTED") {
    return "bg-yellow-100 text-yellow-800";
  }

  if (status === "CANCELLED") {
    return "bg-red-100 text-red-800";
  }

  if (status === "COMPLETED" || status === "INVOICED") {
    return "bg-blue-100 text-blue-800";
  }

  return "bg-slate-100 text-slate-700";
}

export default function EventsPage() {
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [eventName, setEventName] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [guestCount, setGuestCount] = useState<string>("150");
  const [serviceType, setServiceType] = useState<string>("Catering");

  const totalRevenue = useMemo(
    () => events.reduce((sum, event) => sum + toNumber(event.revenue), 0),
    [events],
  );

  const totalFoodCost = useMemo(
    () =>
      events.reduce((sum, event) => {
        const foodCost = toNumber(event.food_cost);
        const totalCost = toNumber(event.total_cost);

        return sum + (foodCost > 0 ? foodCost : totalCost);
      }, 0),
    [events],
  );

  const averageMargin = useMemo(() => {
    const marginEvents = events.filter((event) => toNumber(event.margin) > 0);

    if (marginEvents.length === 0) {
      return 0;
    }

    const totalMargin = marginEvents.reduce(
      (sum, event) => sum + toNumber(event.margin),
      0,
    );

    return totalMargin / marginEvents.length;
  }, [events]);

  const pendingEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.status === "DRAFT" ||
          event.status === "PENDING_APPROVAL" ||
          event.status === "QUOTED",
      ),
    [events],
  );

  const completedEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.status === "COMPLETED" ||
          event.status === "INVOICED" ||
          event.status === "PAID",
      ),
    [events],
  );

  async function loadEvents(): Promise<void> {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/events", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as EventsApiResponse;

      if (!response.ok || !data.success) {
        setEvents([]);
        setErrorMessage(data.error ?? "Failed to load events.");
        return;
      }

      setEvents(data.events ?? data.data ?? []);
    } catch {
      setEvents([]);
      setErrorMessage("Failed to connect to events API.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createEvent(): Promise<void> {
    try {
      setIsSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const cleanName = eventName.trim();
      const cleanDate = eventDate.trim();
      const cleanGuestCount = Number(guestCount);

      if (!cleanName) {
        setErrorMessage("Event name is required.");
        return;
      }

      if (!cleanDate) {
        setErrorMessage("Event date is required.");
        return;
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
                body: JSON.stringify({
          name: cleanName,
          eventName: cleanName, 
          eventDate: cleanDate,
          event_date: cleanDate, 
          guestCount: Number.isFinite(cleanGuestCount) ? cleanGuestCount : 0,
          guest_count: Number.isFinite(cleanGuestCount) ? cleanGuestCount : 0, 
          serviceType,
          service_type: serviceType, 
          status: "DRAFT" as EventStatus, 
          revenue: 0, 
          foodCost: 0, 
          food_cost: 0, 
          totalCost: 0, 
          total_cost: 0, 
          margin: 0, 
        }),
      });

      const data = (await response.json()) as CreateEventResponse;

      if (!response.ok || !data.success) {
        setErrorMessage(data.error ?? "Failed to create event.");
        return;
      }

      setEventName("");
      setEventDate("");
      setGuestCount("150");
      setServiceType("Catering");
      setShowCreateForm(false);
      setSuccessMessage("Event created successfully.");

      await loadEvents();
    } catch {
      setErrorMessage("Failed to connect to create event API.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  return (
    <main className="min-h-screen bg-[#f6f0e6] px-4 py-6 text-[#172033] md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-[#dfd1bd] bg-white p-6 shadow-lg md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#8b6f47]">
                Catering Operations
              </p>

              <h1 className="mt-3 text-4xl font-black text-[#002515]">
                Events
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
                Create catering events, review food cost, open event menus, and
                send kitchen packets to chefs.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-2xl border border-[#002515] bg-white px-5 py-3 text-sm font-bold text-[#002515] transition hover:-translate-y-1 hover:shadow-lg"
              >
                Dashboard
              </Link>

              <Link
                href="/recipes"
                className="rounded-2xl border border-[#dfd1bd] bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:-translate-y-1 hover:shadow-lg"
              >
                Recipes
              </Link>

              <Link
                href="/invites"
                className="rounded-2xl border border-[#dfd1bd] bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:-translate-y-1 hover:shadow-lg"
              >
                Invites
              </Link>

              <Link
                href="/kitchen"
                className="rounded-2xl border border-[#dfd1bd] bg-white px-5 py-3 text-sm font-bold text-[#172033] transition hover:-translate-y-1 hover:shadow-lg"
              >
                Kitchen
              </Link>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setShowCreateForm((current) => !current)}
                className="rounded-2xl border border-[#002515] bg-[#002515] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-1 hover:shadow-lg"
              >
                {showCreateForm ? "Close" : "New Event"}
              </button>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-1 hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </section>

        {showCreateForm ? (
          <section className="rounded-[32px] border border-[#dfd1bd] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-[#172033]">
              Create Catering Event
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <label className="block">
                <span className="text-sm font-bold text-[#172033]">
                  Event Name
                </span>
                <input
                  suppressHydrationWarning
                  value={eventName}
                  onChange={(event) => setEventName(event.target.value)}
                  placeholder="Corporate Lunch - 150 Guests"
                  className="mt-2 w-full rounded-2xl border border-[#dfd1bd] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#172033]">
                  Event Date
                </span>
                <input
                  suppressHydrationWarning
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#dfd1bd] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#172033]">
                  Guest Count
                </span>
                <input
                  suppressHydrationWarning
                  type="number"
                  min="0"
                  value={guestCount}
                  onChange={(event) => setGuestCount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#dfd1bd] px-4 py-3 text-sm outline-none"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-[#172033]">
                  Service Type
                </span>
                <select
                  suppressHydrationWarning
                  value={serviceType}
                  onChange={(event) => setServiceType(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#dfd1bd] px-4 py-3 text-sm outline-none"
                >
                  <option value="Catering">Catering</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Buffet">Buffet</option>
                  <option value="Corporate Dining">Corporate Dining</option>
                </select>
              </label>
            </div>

            <button
              suppressHydrationWarning
              type="button"
              onClick={() => void createEvent()}
              disabled={isSaving}
              className="mt-5 rounded-2xl bg-[#002515] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create Event"}
            </button>
          </section>
        ) : null}

        {errorMessage.length > 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage.length > 0 ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
            {successMessage}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold text-[#667085]">Total Events</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {events.length}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold text-[#667085]">Event Revenue</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {formatCurrency(totalRevenue)}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold text-[#667085]">Food Cost</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {formatCurrency(totalFoodCost)}
            </p>
          </div>

          <div className="rounded-3xl border bg-white p-5">
            <p className="text-sm font-bold text-[#667085]">Avg Margin</p>
            <p className="mt-4 text-4xl font-black text-[#002515]">
              {formatPercent(averageMargin)}
            </p>
          </div>
        </section>

        <section className="rounded-[32px] border border-[#dfd1bd] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
                Calendar + Order Review
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#172033]">
                Catering Event Board
              </h2>
            </div>

            <div className="flex rounded-2xl border bg-[#fbf7f0] p-1">
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  viewMode === "list"
                    ? "bg-[#002515] text-white"
                    : "text-[#172033]"
                }`}
              >
                List
              </button>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  viewMode === "calendar"
                    ? "bg-[#002515] text-white"
                    : "text-[#172033]"
                }`}
              >
                Calendar
              </button>
            </div>
          </div>

          {isLoading ? (
            <p className="mt-5 rounded-2xl bg-[#fbf7f0] px-4 py-3 text-sm text-[#667085]">
              Loading events...
            </p>
          ) : null}

          {!isLoading && events.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#fbf7f0] px-4 py-3 text-sm text-[#667085]">
              No events yet. Click New Event to create the first catering event.
            </p>
          ) : null}

          {viewMode === "calendar" && events.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-3xl border border-[#dfd1bd] bg-[#fbf7f0] p-5"
                >
                  <p className="text-sm font-bold text-[#8b6f47]">
                    {formatDate(event.event_date)}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-[#172033]">
                    {event.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#667085]">
                    Guests: {toNumber(event.guest_count)}
                  </p>
                  <Link
                    href={`/events/${event.id}`}
                    className="mt-4 inline-block rounded-xl bg-[#002515] px-4 py-3 text-sm font-bold text-white"
                  >
                    Open Event
                  </Link>
                </div>
              ))}
            </div>
          ) : null}

          {viewMode === "list" && events.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-3xl border border-[#dfd1bd]">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-[#fbf7f0] text-[#667085]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Event</th>
                    <th className="px-4 py-3 font-bold">Date</th>
                    <th className="px-4 py-3 font-bold">Guests</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Revenue</th>
                    <th className="px-4 py-3 font-bold">Food Cost</th>
                    <th className="px-4 py-3 font-bold">Margin</th>
                    <th className="px-4 py-3 font-bold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {events.map((event) => (
                    <tr key={event.id} className="border-t border-[#dfd1bd]">
                      <td className="px-4 py-3 font-black text-[#172033]">
                        {event.name}
                      </td>
                      <td className="px-4 py-3 text-[#667085]">
                        {formatDate(event.event_date)}
                      </td>
                      <td className="px-4 py-3 text-[#667085]">
                        {toNumber(event.guest_count)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            event.status,
                          )}`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#172033]">
                        {formatCurrency(event.revenue)}
                      </td>
                      <td className="px-4 py-3 text-[#172033]">
                        {formatCurrency(event.food_cost ?? event.total_cost)}
                      </td>
                      <td className="px-4 py-3 text-[#172033]">
                        {formatPercent(event.margin)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/events/${event.id}`}
                            className="rounded-xl border border-[#dfd1bd] bg-white px-3 py-2 text-xs font-bold text-[#172033]"
                          >
                            Event Menu
                          </Link>

                          <Link
                            href={`/events/${event.id}/kitchen-packet`}
                            className="rounded-xl bg-[#002515] px-3 py-2 text-xs font-bold text-white"
                          >
                            Kitchen Packet
                          </Link>

                          <Link
                            href={`/quotes/${event.id}`}
                            className="rounded-xl border border-[#dfd1bd] bg-white px-3 py-2 text-xs font-bold text-[#172033]"
                          >
                            Quote
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[#dfd1bd] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
              Pending Work
            </p>
            <p className="mt-3 text-4xl font-black text-[#002515]">
              {pendingEvents.length}
            </p>
            <p className="mt-2 text-sm text-[#667085]">
              Draft, quoted, or approval-required events.
            </p>
          </div>

          <div className="rounded-3xl border border-[#dfd1bd] bg-white p-5 shadow-sm">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#8b6f47]">
              Completed / Paid
            </p>
            <p className="mt-3 text-4xl font-black text-[#002515]">
              {completedEvents.length}
            </p>
            <p className="mt-2 text-sm text-[#667085]">
              Events completed, invoiced, or paid.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}