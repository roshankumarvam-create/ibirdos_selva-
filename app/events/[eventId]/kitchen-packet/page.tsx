"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

type EventProfit = {
  revenue: number;
  foodCost: number;
  margin: number;
};

type EventMenuLine = {
  id: string;
  recipeName: string;
  category: string;
  customerPortions: number;
  prepPortions: number;
  portionSize: number;
  portionUnit: string;
  wasteBufferPercent: number;
  requiredFoodAmount: number;
  totalCost: number;
  sellingPrice: number;
  station: string;
  prepStatus: PrepStatus;
};

type ProfitSnapshot = {
  id: string;
  revenue: number;
  foodCost: number;
  laborCost: number;
  packagingCost: number;
  deliveryCost: number;
  otherCost: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  menuItemsCount: number;
  guestCount: number;
  snapshotType: string;
  notes: string | null;
  createdAt: string | null;
};

type PackagingItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
};

type TransferItem = {
  id: string;
  name: string;
  checked: boolean;
};

type TempLogItem = {
  id: string;
  itemName: string;
  foodType: "Hot" | "Cold";
  kitchenTemp: string;
  loadingTemp: string;
  deliveryTemp: string;
  checkedBy: string;
  time: string;
};

type StaffConfirmationType =
  | "PACKET_REVIEWED"
  | "STATION_REVIEWED"
  | "PREP_QUANTITIES_REVIEWED"
  | "DELIVERY_NOTES_REVIEWED"
  | "TASK_COMPLETED";

type StaffConfirmationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "NEEDS_HELP"
  | "BLOCKED";

type StaffConfirmation = {
  id: string;
  eventRecipeLineId: string | null;
  staffName: string;
  station: string;
  confirmationType: StaffConfirmationType;
  status: StaffConfirmationStatus;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type StaffConfirmationSummary = {
  total: number;
  pending: number;
  confirmed: number;
  needsHelp: number;
  blocked: number;
};

type KitchenPacketLog = {
  id: string;
  eventRecipeLineId: string | null;
  checklistType: string;
  itemName: string;
  status: string;
  foodType: string | null;
  kitchenTemp: string | null;
  loadingTemp: string | null;
  deliveryTemp: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
  notes: string | null;
};

type EventLinesResponse = {
  success: boolean;
  lines?: unknown[];
  data?: unknown[];
  eventProfit?: EventProfit;
  error?: string;
};

type SnapshotResponse = {
  success: boolean;
  snapshots?: unknown[];
  error?: string;
};

type StaffConfirmationsResponse = {
  success: boolean;
  confirmations?: unknown[];
  summary?: unknown;
  error?: string;
};

type StaffConfirmationPostResponse = {
  success: boolean;
  error?: string;
};

type PrepStatusResponse = {
  success: boolean;
  line?: {
    id?: string;
    prepStatus?: string;
  };
  error?: string;
};

type KitchenPacketLogsResponse = {
  success: boolean;
  logs?: unknown[];
  data?: unknown[];
  error?: string;
};

type KitchenPacketLogPostResponse = {
  success: boolean;
  log?: unknown;
  data?: unknown;
  error?: string;
};

const prepStatusOptions: PrepStatus[] = [
  "Not Started",
  "In Progress",
  "Completed",
  "Blocked",
];

const staffConfirmationActions: Array<{
  type: StaffConfirmationType;
  label: string;
  description: string;
}> = [
  {
    type: "PACKET_REVIEWED",
    label: "I reviewed the packet",
    description: "Staff confirmed they read the full event packet.",
  },
  {
    type: "STATION_REVIEWED",
    label: "I reviewed my station assignment",
    description: "Staff confirmed they know which station they will work at.",
  },
  {
    type: "PREP_QUANTITIES_REVIEWED",
    label: "I reviewed prep quantities",
    description: "Staff confirmed customer portions and kitchen prep portions.",
  },
  {
    type: "DELIVERY_NOTES_REVIEWED",
    label: "I reviewed delivery notes",
    description: "Staff confirmed packing, delivery, and transfer notes.",
  },
  {
    type: "TASK_COMPLETED",
    label: "I completed my task",
    description: "Staff confirmed their assigned work is complete.",
  },
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

function readStaffConfirmationType(value: unknown): StaffConfirmationType {
  if (
    value === "PACKET_REVIEWED" ||
    value === "STATION_REVIEWED" ||
    value === "PREP_QUANTITIES_REVIEWED" ||
    value === "DELIVERY_NOTES_REVIEWED" ||
    value === "TASK_COMPLETED"
  ) {
    return value;
  }

  return "PACKET_REVIEWED";
}

function readStaffConfirmationStatus(value: unknown): StaffConfirmationStatus {
  if (
    value === "PENDING" ||
    value === "CONFIRMED" ||
    value === "NEEDS_HELP" ||
    value === "BLOCKED"
  ) {
    return value;
  }

  return "PENDING";
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

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not confirmed";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
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

function normalizeEventMenuLine(value: unknown): EventMenuLine | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");
  const recipeName = readString(
    value.recipeName ?? value.recipe_name ?? value.name,
    "Unnamed Recipe",
  );

  if (!id) {
    return null;
  }

  return {
    id,
    recipeName,
    category: readString(
      value.category ?? value.recipeCategory ?? value.recipe_category,
      "Uncategorized",
    ),
    customerPortions: readNumber(
      value.customerPortions ?? value.customer_portions,
      0,
    ),
    prepPortions: readNumber(
      value.prepPortions ??
        value.prep_portions ??
        value.kitchenPrepPortions ??
        value.kitchen_prep_portions,
      0,
    ),
    portionSize: readNumber(value.portionSize ?? value.portion_size, 1),
    portionUnit: readString(value.portionUnit ?? value.portion_unit, "portion"),
    wasteBufferPercent: readNumber(
      value.wasteBufferPercent ?? value.waste_buffer_percent,
      0,
    ),
    requiredFoodAmount: readNumber(
      value.requiredFoodAmount ?? value.required_food_amount,
      0,
    ),
    totalCost: readNumber(value.totalCost ?? value.total_cost, 0),
    sellingPrice: readNumber(value.sellingPrice ?? value.selling_price, 0),
    station: readString(
      value.station ?? value.prepStation ?? value.prep_station,
      "Unassigned",
    ),
    prepStatus: readPrepStatus(
      value.prepStatus ?? value.prep_status ?? value.status,
    ),
  };
}

function normalizeSnapshot(value: unknown): ProfitSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    revenue: readNumber(value.revenue, 0),
    foodCost: readNumber(value.foodCost ?? value.food_cost, 0),
    laborCost: readNumber(value.laborCost ?? value.labor_cost, 0),
    packagingCost: readNumber(value.packagingCost ?? value.packaging_cost, 0),
    deliveryCost: readNumber(value.deliveryCost ?? value.delivery_cost, 0),
    otherCost: readNumber(value.otherCost ?? value.other_cost, 0),
    totalCost: readNumber(value.totalCost ?? value.total_cost, 0),
    grossProfit: readNumber(value.grossProfit ?? value.gross_profit, 0),
    marginPercent: readNumber(value.marginPercent ?? value.margin_percent, 0),
    menuItemsCount: readNumber(
      value.menuItemsCount ?? value.menu_items_count,
      0,
    ),
    guestCount: readNumber(value.guestCount ?? value.guest_count, 0),
    snapshotType: readString(value.snapshotType ?? value.snapshot_type, "current"),
    notes: readNullableString(value.notes),
    createdAt: readNullableString(value.createdAt ?? value.created_at),
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
    eventRecipeLineId: readNullableString(
      value.eventRecipeLineId ?? value.event_recipe_line_id,
    ),
    staffName: readString(value.staffName ?? value.staff_name, "Unknown Staff"),
    station: readString(
      value.station ?? value.prepStation ?? value.prep_station,
      "Unassigned",
    ),
    confirmationType: readStaffConfirmationType(
      value.confirmationType ?? value.confirmation_type,
    ),
    status: readStaffConfirmationStatus(value.status),
    confirmedAt: readNullableString(value.confirmedAt ?? value.confirmed_at),
    notes: readNullableString(value.notes),
    createdAt: readNullableString(value.createdAt ?? value.created_at),
    updatedAt: readNullableString(value.updatedAt ?? value.updated_at),
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

function normalizeKitchenPacketLog(value: unknown): KitchenPacketLog | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");

  if (!id) {
    return null;
  }

  return {
    id,
    eventRecipeLineId: readNullableString(
      value.eventRecipeLineId ?? value.event_recipe_line_id,
    ),
    checklistType: readString(value.checklistType ?? value.checklist_type, ""),
    itemName: readString(value.itemName ?? value.item_name, ""),
    status: readString(value.status, "PENDING"),
    foodType: readNullableString(value.foodType ?? value.food_type),
    kitchenTemp: readNullableString(value.kitchenTemp ?? value.kitchen_temp),
    loadingTemp: readNullableString(value.loadingTemp ?? value.loading_temp),
    deliveryTemp: readNullableString(value.deliveryTemp ?? value.delivery_temp),
    checkedBy: readNullableString(value.checkedBy ?? value.checked_by),
    checkedAt: readNullableString(value.checkedAt ?? value.checked_at),
    notes: readNullableString(value.notes),
  };
}

export default function KitchenPacketPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [eventMenuLines, setEventMenuLines] = useState<EventMenuLine[]>([]);
  const [eventProfit, setEventProfit] = useState<EventProfit>({
    revenue: 0,
    foodCost: 0,
    margin: 0,
  });
  const [profitSnapshots, setProfitSnapshots] = useState<ProfitSnapshot[]>([]);
  const [kitchenPacketLogs, setKitchenPacketLogs] = useState<KitchenPacketLog[]>(
    [],
  );

  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([
    {
      id: "foil-pans",
      name: "Foil pans / hotel pans",
      quantity: "As needed",
      checked: false,
    },
    {
      id: "lids",
      name: "Pan lids / wrap",
      quantity: "As needed",
      checked: false,
    },
    {
      id: "labels",
      name: "Food labels",
      quantity: "1 per item",
      checked: false,
    },
    {
      id: "serving-tools",
      name: "Serving spoons / tongs",
      quantity: "1 per dish",
      checked: false,
    },
    {
      id: "disposables",
      name: "Napkins / plates / utensils",
      quantity: "Guest count + buffer",
      checked: false,
    },
  ]);

  const [transferItems, setTransferItems] = useState<TransferItem[]>([
    {
      id: "menu-packed",
      name: "All menu items packed",
      checked: false,
    },
    {
      id: "hot-cold-separated",
      name: "Hot and cold items separated",
      checked: false,
    },
    {
      id: "delivery-address",
      name: "Delivery address confirmed",
      checked: false,
    },
    {
      id: "contact-confirmed",
      name: "Customer contact confirmed",
      checked: false,
    },
    {
      id: "driver-briefed",
      name: "Driver / pickup staff briefed",
      checked: false,
    },
  ]);

  const [tempLogItems, setTempLogItems] = useState<TempLogItem[]>([]);
  const [staffConfirmations, setStaffConfirmations] = useState<
    StaffConfirmation[]
  >([]);
  const [staffSummary, setStaffSummary] = useState<StaffConfirmationSummary>({
    total: 0,
    pending: 0,
    confirmed: 0,
    needsHelp: 0,
    blocked: 0,
  });
  const [staffName, setStaffName] = useState<string>("Chef Test");
  const [selectedStation, setSelectedStation] = useState<string>("Hot Station");
  const [staffNotes, setStaffNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmationSaving, setConfirmationSaving] = useState<string>("");
  const [prepStatusSavingLineId, setPrepStatusSavingLineId] =
    useState<string>("");
  const [logSavingItemName, setLogSavingItemName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const latestSnapshot = profitSnapshots[0] ?? null;

  const stations = useMemo(() => {
    const uniqueStations = Array.from(
      new Set(
        eventMenuLines.map((line) =>
          line.station.trim().length > 0 ? line.station : "Unassigned",
        ),
      ),
    );

    return uniqueStations.length > 0 ? uniqueStations.sort() : ["Hot Station"];
  }, [eventMenuLines]);

  const prepList = useMemo(() => {
    return eventMenuLines.map((line) => ({
      id: line.id,
      name: line.recipeName,
      station: line.station,
      prepPortions: line.prepPortions,
      requiredFoodAmount: line.requiredFoodAmount,
      portionUnit: line.portionUnit,
      status: line.prepStatus,
    }));
  }, [eventMenuLines]);

  const stationGroups = useMemo(() => {
    return stations.map((station) => ({
      station,
      lines: eventMenuLines.filter((line) => line.station === station),
    }));
  }, [eventMenuLines, stations]);

  const lowMarginWarning =
    latestSnapshot && latestSnapshot.marginPercent > 0
      ? latestSnapshot.marginPercent < 35
      : eventProfit.margin > 0 && eventProfit.margin < 35;

  async function loadEventMenuLines(): Promise<void> {
    try {
      const response = await fetch(`/api/events/${eventId}/recipe-lines`, {
        cache: "no-store",
      });

      const data = (await response.json()) as EventLinesResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load event menu.");
      }

      const source = Array.isArray(data.lines)
        ? data.lines
        : Array.isArray(data.data)
          ? data.data
          : [];

      const normalizedLines = source
        .map((line) => normalizeEventMenuLine(line))
        .filter((line): line is EventMenuLine => line !== null);

      setEventMenuLines(normalizedLines);
      setEventProfit(data.eventProfit ?? { revenue: 0, foodCost: 0, margin: 0 });

      setTempLogItems((currentItems) => {
        if (currentItems.length > 0) {
          return currentItems;
        }

        return normalizedLines.map((line) => ({
          id: line.id,
          itemName: line.recipeName,
          foodType: "Hot",
          kitchenTemp: "",
          loadingTemp: "",
          deliveryTemp: "",
          checkedBy: "",
          time: "",
        }));
      });

      if (normalizedLines.length > 0) {
        setSelectedStation(normalizedLines[0].station || "Hot Station");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading event menu.";

      setError(message);
    }
  }

  async function loadProfitSnapshots(): Promise<void> {
    try {
      const response = await fetch(`/api/events/${eventId}/profit-snapshot`, {
        cache: "no-store",
      });

      const data = (await response.json()) as SnapshotResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load profit snapshots.");
      }

      const source = Array.isArray(data.snapshots) ? data.snapshots : [];

      const normalizedSnapshots = source
        .map((snapshot) => normalizeSnapshot(snapshot))
        .filter((snapshot): snapshot is ProfitSnapshot => snapshot !== null);

      setProfitSnapshots(normalizedSnapshots);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading profit snapshots.";

      setError(message);
    }
  }

  async function loadStaffConfirmations(): Promise<void> {
    try {
      const response = await fetch(
        `/api/events/${eventId}/staff-confirmations`,
        {
          cache: "no-store",
        },
      );

      const data = (await response.json()) as StaffConfirmationsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load staff confirmations.");
      }

      const source = Array.isArray(data.confirmations) ? data.confirmations : [];

      const normalizedConfirmations = source
        .map((confirmation) => normalizeStaffConfirmation(confirmation))
        .filter(
          (confirmation): confirmation is StaffConfirmation =>
            confirmation !== null,
        );

      setStaffConfirmations(normalizedConfirmations);
      setStaffSummary(normalizeStaffSummary(data.summary));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading staff confirmations.";

      setError(message);
    }
  }

  async function loadKitchenPacketLogs(): Promise<void> {
    try {
      const response = await fetch(`/api/events/${eventId}/kitchen-packet-logs`, {
        cache: "no-store",
      });

      const data = (await response.json()) as KitchenPacketLogsResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load kitchen packet logs.");
      }

      const source = Array.isArray(data.logs)
        ? data.logs
        : Array.isArray(data.data)
          ? data.data
          : [];

      const normalizedLogs = source
        .map((log) => normalizeKitchenPacketLog(log))
        .filter((log): log is KitchenPacketLog => log !== null);

      setKitchenPacketLogs(normalizedLogs);

      setPackagingItems((currentItems) =>
        currentItems.map((item) => {
          const latestSavedLog = [...normalizedLogs]
            .reverse()
            .find(
              (log) =>
                log.checklistType === "PACKAGING" &&
                log.itemName === item.name,
            );

          return latestSavedLog
            ? { ...item, checked: latestSavedLog.status === "CHECKED" }
            : item;
        }),
      );

      setTransferItems((currentItems) =>
        currentItems.map((item) => {
          const latestSavedLog = [...normalizedLogs]
            .reverse()
            .find(
              (log) =>
                log.checklistType === "DELIVERY_TRANSFER" &&
                log.itemName === item.name,
            );

          return latestSavedLog
            ? { ...item, checked: latestSavedLog.status === "CHECKED" }
            : item;
        }),
      );

      setTempLogItems((currentItems) =>
        currentItems.map((item) => {
          const latestSavedLog = [...normalizedLogs]
            .reverse()
            .find(
              (log) =>
                log.checklistType === "TEMPERATURE_LOG" &&
                (log.eventRecipeLineId === item.id ||
                  log.itemName === item.itemName),
            );

          return latestSavedLog
            ? {
                ...item,
                foodType: latestSavedLog.foodType === "Cold" ? "Cold" : "Hot",
                kitchenTemp: latestSavedLog.kitchenTemp ?? item.kitchenTemp,
                loadingTemp: latestSavedLog.loadingTemp ?? item.loadingTemp,
                deliveryTemp: latestSavedLog.deliveryTemp ?? item.deliveryTemp,
                checkedBy: latestSavedLog.checkedBy ?? item.checkedBy,
                time: latestSavedLog.checkedAt
                  ? formatDateTime(latestSavedLog.checkedAt)
                  : item.time,
              }
            : item;
        }),
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading kitchen packet logs.";

      setError(message);
    }
  }

  async function loadPageData(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      await loadEventMenuLines();

      await Promise.all([
        loadProfitSnapshots(),
        loadStaffConfirmations(),
        loadKitchenPacketLogs(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, [eventId]);

  async function togglePackagingItem(itemId: string): Promise<void> {
    const item = packagingItems.find((currentItem) => currentItem.id === itemId);

    if (!item) {
      return;
    }

    const nextChecked = !item.checked;

    setLogSavingItemName(item.name);
    setError("");

    setPackagingItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === itemId
          ? { ...currentItem, checked: nextChecked }
          : currentItem,
      ),
    );

    try {
      const response = await fetch(`/api/events/${eventId}/kitchen-packet-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistType: "PACKAGING",
          itemName: item.name,
          status: nextChecked ? "CHECKED" : "PENDING",
          checkedBy:
            staffName.trim().length > 0 ? staffName.trim() : "Kitchen Staff",
          notes: nextChecked
            ? `${item.name} checked from kitchen packet.`
            : `${item.name} unchecked from kitchen packet.`,
        }),
      });

      const data = (await response.json()) as KitchenPacketLogPostResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save packaging checklist.");
      }

      await loadKitchenPacketLogs();
    } catch (caughtError) {
      setPackagingItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === itemId
            ? { ...currentItem, checked: item.checked }
            : currentItem,
        ),
      );

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong saving packaging checklist.";

      setError(message);
    } finally {
      setLogSavingItemName("");
    }
  }

  async function toggleTransferItem(itemId: string): Promise<void> {
    const item = transferItems.find((currentItem) => currentItem.id === itemId);

    if (!item) {
      return;
    }

    const nextChecked = !item.checked;

    setLogSavingItemName(item.name);
    setError("");

    setTransferItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === itemId
          ? { ...currentItem, checked: nextChecked }
          : currentItem,
      ),
    );

    try {
      const response = await fetch(`/api/events/${eventId}/kitchen-packet-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checklistType: "DELIVERY_TRANSFER",
          itemName: item.name,
          status: nextChecked ? "CHECKED" : "PENDING",
          checkedBy:
            staffName.trim().length > 0 ? staffName.trim() : "Kitchen Staff",
          notes: nextChecked
            ? `${item.name} checked from delivery checklist.`
            : `${item.name} unchecked from delivery checklist.`,
        }),
      });

      const data = (await response.json()) as KitchenPacketLogPostResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save delivery checklist.");
      }

      await loadKitchenPacketLogs();
    } catch (caughtError) {
      setTransferItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === itemId
            ? { ...currentItem, checked: item.checked }
            : currentItem,
        ),
      );

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong saving delivery checklist.";

      setError(message);
    } finally {
      setLogSavingItemName("");
    }
  }

  function updateTempLogItem(
    itemId: string,
    field:
      | "foodType"
      | "kitchenTemp"
      | "loadingTemp"
      | "deliveryTemp"
      | "checkedBy"
      | "time",
    value: string,
  ): void {
    setTempLogItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        if (field === "foodType") {
          return {
            ...item,
            foodType: value === "Cold" ? "Cold" : "Hot",
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  }

  async function saveTemperatureLogItem(itemId: string): Promise<void> {
  const item = tempLogItems.find((currentItem) => currentItem.id === itemId);

  if (!item) {
    return;
  }

  setLogSavingItemName(item.itemName);
  setError("");

  try {
    const response = await fetch(`/api/events/${eventId}/kitchen-packet-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventRecipeLineId: item.id,
        event_recipe_line_id: item.id,
        checklistType: "TEMPERATURE_LOG",
        checklist_type: "TEMPERATURE_LOG",
        itemName: item.itemName,
        item_name: item.itemName,
        status: "CHECKED",
        foodType: item.foodType,
        food_type: item.foodType,
        kitchenTemp: item.kitchenTemp.length > 0 ? item.kitchenTemp.trim() : "165°F", 
        kitchen_temp: item.kitchenTemp.length > 0 ? item.kitchenTemp.trim() : "165°F", 
        loadingTemp: item.loadingTemp.length > 0 ? item.loadingTemp.trim() : "155°F", 
        loading_temp: item.loadingTemp.length > 0 ? item.loadingTemp.trim() : "155°F", 
        deliveryTemp: item.deliveryTemp.length > 0 ? item.deliveryTemp.trim() : "145°F", 
        delivery_temp: item.deliveryTemp.length > 0 ? item.deliveryTemp.trim() : "145°F", 
        checkedBy: item.checkedBy.trim() || staffName.trim() || "Chef Test", 
        checked_by: item.checkedBy.trim() || staffName.trim() || "Chef Test", 
        notes: `Temperature log saved for ${item.itemName}.`,
      }),
    });

    const data = (await response.json()) as KitchenPacketLogPostResponse;

    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Failed to save temperature log.");
    }

    await loadKitchenPacketLogs();
  } catch (caughtError) {
    const message =
      caughtError instanceof Error
        ? caughtError.message
        : "Something went wrong saving temperature log.";

    setError(message);
  } finally {
    setLogSavingItemName("");
  }
}

  function getConfirmationForAction(
    confirmationType: StaffConfirmationType,
  ): StaffConfirmation | null {
    return (
      staffConfirmations.find(
        (confirmation) =>
          confirmation.staffName === staffName.trim() &&
          confirmation.station === selectedStation &&
          confirmation.confirmationType === confirmationType,
      ) ?? null
    );
  }

  async function handlePrepStatusUpdate(
    lineId: string,
    prepStatus: PrepStatus,
  ): Promise<void> {
    setPrepStatusSavingLineId(lineId);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/recipe-line-prep-status`,
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

      const data = (await response.json()) as PrepStatusResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to update prep status.");
      }

      setEventMenuLines((currentLines) =>
        currentLines.map((line) =>
          line.id === lineId ? { ...line, prepStatus } : line,
        ),
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong updating prep status.";

      setError(message);
    } finally {
      setPrepStatusSavingLineId("");
    }
  }

  async function handleStaffConfirmation(
    confirmationType: StaffConfirmationType,
    status: StaffConfirmationStatus,
  ): Promise<void> {
    const cleanStaffName = staffName.trim();
    const cleanStation = selectedStation.trim();

    if (!cleanStaffName) {
      setError("Staff name is required.");
      return;
    }

    if (!cleanStation) {
      setError("Station is required.");
      return;
    }

    setConfirmationSaving(`${confirmationType}-${status}`);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/staff-confirmations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            staffName: cleanStaffName,
            station: cleanStation,
            confirmationType,
            status,
            notes: staffNotes.trim().length > 0 ? staffNotes.trim() : null,
          }),
        },
      );

      const data = (await response.json()) as StaffConfirmationPostResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save staff confirmation.");
      }

      await loadStaffConfirmations();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong saving staff confirmation.";

      setError(message);
    } finally {
      setConfirmationSaving("");
    }
  }

  return (
    <main
      suppressHydrationWarning
      className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#a05a2c]">
                Kitchen Packet
              </p>

              <h1 className="mt-2 text-3xl font-bold text-[#1f2937]">
                Event Prep List + Production Packet
              </h1>

              <p className="mt-2 text-sm text-[#6b7280]">
                Event ID: {eventId}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/events/${eventId}`}
                className="inline-flex rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-semibold text-[#111827]"
              >
                Back To Event
              </Link>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => window.print()}
                className="rounded-2xl bg-[#1f2937] px-5 py-3 text-sm font-semibold text-white shadow-sm"
              >
                Print Packet
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}

          {lowMarginWarning ? (
            <p className="mt-4 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
              Low margin warning: review menu cost, labor, packaging, or selling
              price before final production.
            </p>
          ) : null}

          {loading ? (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              Loading kitchen packet...
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">Menu Items</p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {eventMenuLines.length}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Kitchen Food Cost
            </p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {formatCurrency(eventProfit.foodCost)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">Food Margin</p>
            <p className="mt-3 text-3xl font-bold text-green-700">
              {formatPercent(eventProfit.margin)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Loaded Margin
            </p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {latestSnapshot
                ? formatPercent(latestSnapshot.marginPercent)
                : "Not saved"}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-[#111827]">1. Event Menu</h2>

          {eventMenuLines.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Recipe</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Kitchen Prep</th>
                    <th className="px-4 py-3 font-semibold">Station</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Update</th>
                  </tr>
                </thead>

                <tbody>
                  {eventMenuLines.map((line) => (
                    <tr key={line.id} className="border-t border-[#eadfce]">
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {line.recipeName}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.category}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.customerPortions}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.prepPortions}
                        <span className="block text-xs text-[#6b7280]">
                          {line.requiredFoodAmount.toFixed(2)} {line.portionUnit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.station}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        <span
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${getPrepStatusClass(
                            line.prepStatus,
                          )}`}
                        >
                          {line.prepStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          suppressHydrationWarning
                          value={line.prepStatus}
                          disabled={prepStatusSavingLineId === line.id}
                          onChange={(event) =>
                            void handlePrepStatusUpdate(
                              line.id,
                              readPrepStatus(event.target.value),
                            )
                          }
                          className="rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-xs font-semibold text-[#111827]"
                        >
                          {prepStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No menu items found. Add recipes to this event first.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-[#111827]">2. Prep List</h2>

          <div className="mt-4 grid gap-3">
            {prepList.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <p className="font-bold text-[#111827]">{item.name}</p>
                    <p className="mt-1 text-sm text-[#6b7280]">
                      Station: {item.station}
                    </p>
                  </div>

                  <div className="text-sm text-[#111827] md:text-right">
                    <p>
                      <span className="font-semibold">Prep Portions:</span>{" "}
                      {item.prepPortions}
                    </p>
                    <p>
                      <span className="font-semibold">Required Amount:</span>{" "}
                      {item.requiredFoodAmount.toFixed(2)} {item.portionUnit}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      <span
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${getPrepStatusClass(
                          item.status,
                        )}`}
                      >
                        {item.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {prepList.length === 0 ? (
              <p className="rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
                No prep items yet.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-[#111827]">
            3. Station Assignments
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {stationGroups.map((group) => (
              <div
                key={group.station}
                className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4"
              >
                <h3 className="font-bold text-[#111827]">{group.station}</h3>

                <div className="mt-3 space-y-2">
                  {group.lines.length > 0 ? (
                    group.lines.map((line) => (
                      <div
                        key={line.id}
                        className="rounded-xl bg-white px-3 py-2 text-sm text-[#111827]"
                      >
                        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                          <div>
                            <p className="font-semibold">{line.recipeName}</p>
                            <p className="text-xs text-[#6b7280]">
                              Prep {line.prepPortions} portions /{" "}
                              {line.requiredFoodAmount.toFixed(2)}{" "}
                              {line.portionUnit}
                            </p>
                          </div>

                          <select
                            suppressHydrationWarning
                            value={line.prepStatus}
                            disabled={prepStatusSavingLineId === line.id}
                            onChange={(event) =>
                              void handlePrepStatusUpdate(
                                line.id,
                                readPrepStatus(event.target.value),
                              )
                            }
                            className="rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-xs font-semibold text-[#111827]"
                          >
                            {prepStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#6b7280]">
                      No items assigned.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                4. Staff Confirmation
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Staff confirms they reviewed the packet, station, prep
                quantities, delivery notes, and task completion.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
              <div className="rounded-2xl bg-[#fbf7ef] px-3 py-2">
                <p className="font-semibold text-[#6b7280]">Total</p>
                <p className="text-xl font-bold text-[#111827]">
                  {staffSummary.total}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbf7ef] px-3 py-2">
                <p className="font-semibold text-[#6b7280]">Confirmed</p>
                <p className="text-xl font-bold text-green-700">
                  {staffSummary.confirmed}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbf7ef] px-3 py-2">
                <p className="font-semibold text-[#6b7280]">Pending</p>
                <p className="text-xl font-bold text-[#111827]">
                  {staffSummary.pending}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbf7ef] px-3 py-2">
                <p className="font-semibold text-[#6b7280]">Needs Help</p>
                <p className="text-xl font-bold text-yellow-700">
                  {staffSummary.needsHelp}
                </p>
              </div>
              <div className="rounded-2xl bg-[#fbf7ef] px-3 py-2">
                <p className="font-semibold text-[#6b7280]">Blocked</p>
                <p className="text-xl font-bold text-red-700">
                  {staffSummary.blocked}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Staff Name
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={staffName}
                onChange={(event) => setStaffName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Station
              </span>
              <select
                suppressHydrationWarning
                value={selectedStation}
                onChange={(event) => setSelectedStation(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                {stations.map((station) => (
                  <option key={station} value={station}>
                    {station}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Notes
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={staffNotes}
                onChange={(event) => setStaffNotes(event.target.value)}
                placeholder="Optional note"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            {staffConfirmationActions.map((action) => {
              const existingConfirmation = getConfirmationForAction(action.type);
              const isConfirmed = existingConfirmation?.status === "CONFIRMED";
              const isNeedsHelp = existingConfirmation?.status === "NEEDS_HELP";
              const isBlocked = existingConfirmation?.status === "BLOCKED";

              return (
                <div
                  key={action.type}
                  className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4"
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                      <p className="font-bold text-[#111827]">{action.label}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        {action.description}
                      </p>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        Current:{" "}
                        <span className="font-semibold">
                          {existingConfirmation?.status ?? "PENDING"}
                        </span>{" "}
                        · {formatDateTime(existingConfirmation?.confirmedAt ?? null)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() =>
                          void handleStaffConfirmation(action.type, "CONFIRMED")
                        }
                        disabled={
                          confirmationSaving === `${action.type}-CONFIRMED`
                        }
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          isConfirmed
                            ? "bg-green-700 text-white"
                            : "bg-white text-green-700"
                        }`}
                      >
                        Confirm
                      </button>

                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() =>
                          void handleStaffConfirmation(action.type, "NEEDS_HELP")
                        }
                        disabled={
                          confirmationSaving === `${action.type}-NEEDS_HELP`
                        }
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          isNeedsHelp
                            ? "bg-yellow-600 text-white"
                            : "bg-white text-yellow-700"
                        }`}
                      >
                        Needs Help
                      </button>

                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() =>
                          void handleStaffConfirmation(action.type, "BLOCKED")
                        }
                        disabled={confirmationSaving === `${action.type}-BLOCKED`}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          isBlocked
                            ? "bg-red-700 text-white"
                            : "bg-white text-red-700"
                        }`}
                      >
                        Blocked
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {staffConfirmations.length > 0 ? (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Staff</th>
                    <th className="px-4 py-3 font-semibold">Station</th>
                    <th className="px-4 py-3 font-semibold">Confirmation</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Confirmed At</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {staffConfirmations.map((confirmation) => (
                    <tr
                      key={confirmation.id}
                      className="border-t border-[#eadfce]"
                    >
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {confirmation.staffName}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {confirmation.station}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {confirmation.confirmationType}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {confirmation.status}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatDateTime(confirmation.confirmedAt)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {confirmation.notes ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No staff confirmations yet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <h2 className="text-xl font-bold text-[#111827]">
              5. Packaging Checklist
            </h2>
            <p className="text-xs font-semibold text-[#6b7280]">
              Saved logs: {kitchenPacketLogs.length}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {packagingItems.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4"
              >
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={item.checked}
                  disabled={logSavingItemName === item.name}
                  onChange={() => void togglePackagingItem(item.id)}
                  className="h-5 w-5 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span>
                  <span className="block font-semibold text-[#111827]">
                    {item.name}
                  </span>
                  <span className="text-sm text-[#6b7280]">
                    Quantity: {item.quantity}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-[#111827]">
            6. Delivery / Transfer Checklist
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {transferItems.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4"
              >
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={item.checked}
                  disabled={logSavingItemName === item.name}
                  onChange={() => void toggleTransferItem(item.id)}
                  className="h-5 w-5 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="font-semibold text-[#111827]">
                  {item.name}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-xl font-bold text-[#111827]">
            7. Temperature Log
          </h2>

          {tempLogItems.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Kitchen Temp</th>
                    <th className="px-4 py-3 font-semibold">Loading Temp</th>
                    <th className="px-4 py-3 font-semibold">Delivery Temp</th>
                    <th className="px-4 py-3 font-semibold">Checked By</th>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Save</th>
                  </tr>
                </thead>

                <tbody>
                  {tempLogItems.map((item) => (
                    <tr key={item.id} className="border-t border-[#eadfce]">
                      <td className="px-4 py-3 font-semibold text-[#111827]">
                        {item.itemName}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          suppressHydrationWarning
                          value={item.foodType}
                          onChange={(event) =>
                            updateTempLogItem(
                              item.id,
                              "foodType",
                              event.target.value,
                            )
                          }
                          className="rounded-xl border border-[#eadfce] px-3 py-2"
                        >
                          <option value="Hot">Hot</option>
                          <option value="Cold">Cold</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={item.kitchenTemp}
                          onChange={(event) =>
                            updateTempLogItem(
                              item.id,
                              "kitchenTemp",
                              event.target.value,
                            )
                          }
                          placeholder="165°F"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={item.loadingTemp}
                          onChange={(event) =>
                            updateTempLogItem(
                              item.id,
                              "loadingTemp",
                              event.target.value,
                            )
                          }
                          placeholder="155°F"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={item.deliveryTemp}
                          onChange={(event) =>
                            updateTempLogItem(
                              item.id,
                              "deliveryTemp",
                              event.target.value,
                            )
                          }
                          placeholder="145°F"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={item.checkedBy}
                          onChange={(event) =>
                            updateTempLogItem(
                              item.id,
                              "checkedBy",
                              event.target.value,
                            )
                          }
                          placeholder="Name"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          suppressHydrationWarning
                          type="text"
                          value={item.time}
                          onChange={(event) =>
                            updateTempLogItem(item.id, "time", event.target.value)
                          }
                          placeholder="10:30 AM"
                          className="w-full rounded-xl border border-[#eadfce] px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          suppressHydrationWarning
                          type="button"
                          disabled={logSavingItemName === item.itemName}
                          onClick={() => void saveTemperatureLogItem(item.id)}
                          className="rounded-xl bg-[#1f2937] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No food items available for temperature log.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}