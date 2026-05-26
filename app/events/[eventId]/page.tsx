"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

type Recipe = {
  id: string;
  name: string;
  category: string;
  servings: number;
  foodCost: number;
  sellingPrice: number;
  marginPercent: number;
};

type EventProfit = {
  revenue: number;
  foodCost: number;
  margin: number;
};

type EventRecipeLine = {
  id: string;
  recipeId: string;
  recipeName: string;
  category: string;
  customerPortions: number;
  prepPortions: number;
  portionSize: number;
  portionUnit: string;
  wasteBufferPercent: number;
  requiredFoodAmount: number;
  recipeYield: number;
  batchCount: number;
  roundedBatchCount: number;
  totalCost: number;
  sellingPrice: number;
  station: string;
  prepStatus: PrepStatus;
};

type RecipesResponse = {
  success?: boolean;
  recipes?: unknown[];
  data?: unknown[];
  error?: string;
};

type EventLinesResponse = {
  success: boolean;
  lines?: unknown[];
  data?: unknown[];
  eventProfit?: EventProfit;
  error?: string;
};

type AddRecipeResponse = {
  success: boolean;
  line?: unknown;
  eventProfit?: EventProfit;
  error?: string;
};

type PatchLineResponse = {
  success: boolean;
  line?: unknown;
  error?: string;
};

type DeleteLineResponse = {
  success: boolean;
  error?: string;
};

const categoryOptions = [
  "All",
  "Appetizer",
  "Entree",
  "Side",
  "Dessert",
  "Beverage",
  "Other",
];

const stationOptions = [
  "Unassigned",
  "Hot Station",
  "Cold Station",
  "Grill Station",
  "Fry Station",
  "Prep Station",
  "Bakery Station",
  "Packing Station",
  "Delivery Station",
];

const prepStatusOptions: PrepStatus[] = [
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

function normalizeCategory(value: unknown): string {
  const rawCategory = readString(value, "Other").toLowerCase();

  if (rawCategory.includes("app")) {
    return "Appetizer";
  }

  if (rawCategory.includes("entree") || rawCategory.includes("entrée")) {
    return "Entree";
  }

  if (rawCategory.includes("side")) {
    return "Side";
  }

  if (rawCategory.includes("dessert")) {
    return "Dessert";
  }

  if (rawCategory.includes("beverage") || rawCategory.includes("drink")) {
    return "Beverage";
  }

  return "Other";
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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function normalizeRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");
  const name = readString(
    value.name ?? value.recipeName ?? value.recipe_name,
    "",
  );

  if (!id || !name) {
    return null;
  }

  const servings = readNumber(
    value.servings ??
      value.yield ??
      value.recipeYield ??
      value.recipe_yield ??
      value.portionsPerBatch ??
      value.portions_per_batch,
    1,
  );

  const foodCost = readNumber(
    value.foodCost ??
      value.food_cost ??
      value.totalCost ??
      value.total_cost ??
      value.recipeCost ??
      value.recipe_cost,
    0,
  );

  const sellingPrice = readNumber(
    value.sellingPrice ??
      value.selling_price ??
      value.price ??
      value.menuPrice ??
      value.menu_price,
    0,
  );

  const marginPercent =
    sellingPrice > 0 ? ((sellingPrice - foodCost) / sellingPrice) * 100 : 0;

  return {
    id,
    name,
    category: normalizeCategory(value.category),
    servings: servings > 0 ? servings : 1,
    foodCost,
    sellingPrice,
    marginPercent,
  };
}

function normalizeEventRecipeLine(value: unknown): EventRecipeLine | null {
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

  const portionSize = readNumber(value.portionSize ?? value.portion_size, 1);

  const requiredFoodAmount =
    readNumber(value.requiredFoodAmount ?? value.required_food_amount, 0) ||
    prepPortions * portionSize;

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
    recipeId: readString(value.recipeId ?? value.recipe_id, ""),
    recipeName: readString(
      value.recipeName ?? value.recipe_name ?? value.name,
      "Unnamed Recipe",
    ),
    category: normalizeCategory(
      value.category ?? value.recipeCategory ?? value.recipe_category,
    ),
    customerPortions: readNumber(
      value.customerPortions ?? value.customer_portions,
      0,
    ),
    prepPortions,
    portionSize,
    portionUnit: readString(value.portionUnit ?? value.portion_unit, "portion"),
    wasteBufferPercent: readNumber(
      value.wasteBufferPercent ?? value.waste_buffer_percent,
      0,
    ),
    requiredFoodAmount,
    recipeYield: safeYield,
    batchCount,
    roundedBatchCount,
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

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [eventLines, setEventLines] = useState<EventRecipeLine[]>([]);
  const [eventProfit, setEventProfit] = useState<EventProfit>({
    revenue: 0,
    foodCost: 0,
    margin: 0,
  });

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [guestCount, setGuestCount] = useState<number>(250);
  const [percentEating, setPercentEating] = useState<number>(100);
  const [manualPortionsOverride, setManualPortionsOverride] =
    useState<string>("");
  const [portionSize, setPortionSize] = useState<number>(1);
  const [portionUnit, setPortionUnit] = useState<string>("portion");
  const [wasteBufferPercent, setWasteBufferPercent] = useState<number>(10);
  const [selectedStation, setSelectedStation] = useState<string>("Unassigned");

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [lineSavingId, setLineSavingId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const filteredRecipes = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return recipes
      .filter((recipe) => {
        const matchesCategory =
          categoryFilter === "All" || recipe.category === categoryFilter;

        const matchesSearch =
          cleanSearch.length === 0 ||
          recipe.name.toLowerCase().includes(cleanSearch) ||
          recipe.category.toLowerCase().includes(cleanSearch);

        return matchesCategory && matchesSearch;
      })
      .sort((firstRecipe, secondRecipe) =>
        firstRecipe.name.localeCompare(secondRecipe.name),
      );
  }, [recipes, searchTerm, categoryFilter]);

  const selectedRecipe = useMemo(() => {
    return recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  }, [recipes, selectedRecipeId]);

  const calculatedCustomerPortions = useMemo(() => {
    const manualValue = Number(manualPortionsOverride);

    if (
      manualPortionsOverride.trim().length > 0 &&
      Number.isFinite(manualValue)
    ) {
      return Math.max(0, Math.round(manualValue));
    }

    return Math.max(0, Math.round(guestCount * (percentEating / 100)));
  }, [guestCount, percentEating, manualPortionsOverride]);

  const calculatedPrepPortions = useMemo(() => {
    return Math.ceil(
      calculatedCustomerPortions * (1 + wasteBufferPercent / 100),
    );
  }, [calculatedCustomerPortions, wasteBufferPercent]);

  const selectedRecipeYield = selectedRecipe?.servings ?? 1;
  const safeSelectedRecipeYield =
    selectedRecipeYield > 0 ? selectedRecipeYield : 1;

  const calculatedBatchCount =
    calculatedPrepPortions / safeSelectedRecipeYield;

  const calculatedKitchenBatches = Math.ceil(calculatedBatchCount);

  const calculatedFoodCost = selectedRecipe
    ? calculatedKitchenBatches * selectedRecipe.foodCost
    : 0;

  const calculatedRevenue = selectedRecipe
    ? calculatedCustomerPortions * selectedRecipe.sellingPrice
    : 0;

  const calculatedMargin =
    calculatedRevenue > 0
      ? ((calculatedRevenue - calculatedFoodCost) / calculatedRevenue) * 100
      : 0;

  async function loadRecipes(): Promise<void> {
    const response = await fetch("/api/recipes", {
      cache: "no-store",
    });

    const data = (await response.json()) as RecipesResponse;

    if (!response.ok || data.success === false) {
      throw new Error(data.error ?? "Failed to load recipes.");
    }

    const source = Array.isArray(data.recipes)
      ? data.recipes
      : Array.isArray(data.data)
        ? data.data
        : [];

    const normalizedRecipes = source
      .map((recipe) => normalizeRecipe(recipe))
      .filter((recipe): recipe is Recipe => recipe !== null);

    setRecipes(normalizedRecipes);
  }

  async function loadEventLines(): Promise<void> {
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
      .map((line) => normalizeEventRecipeLine(line))
      .filter((line): line is EventRecipeLine => line !== null);

    setEventLines(normalizedLines);
    setEventProfit(data.eventProfit ?? { revenue: 0, foodCost: 0, margin: 0 });
  }

  async function loadPageData(): Promise<void> {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadRecipes(), loadEventLines()]);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading event data.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, [eventId]);

  useEffect(() => {
    const selectedRecipeStillVisible = filteredRecipes.some(
      (recipe) => recipe.id === selectedRecipeId,
    );

    if (selectedRecipeStillVisible) {
      return;
    }

    setSelectedRecipeId(filteredRecipes[0]?.id ?? "");
  }, [filteredRecipes, selectedRecipeId]);

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>): void {
    setCategoryFilter(event.target.value);
  }

  async function addRecipeToEvent(): Promise<void> {
    if (!selectedRecipe) {
      setError("Select a recipe first.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/events/${eventId}/recipe-lines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId: selectedRecipe.id,
          recipe_id: selectedRecipe.id,
          servings: calculatedCustomerPortions,
          customerPortions: calculatedCustomerPortions,
          customer_portions: calculatedCustomerPortions,
          prepPortions: calculatedPrepPortions,
          prep_portions: calculatedPrepPortions,
          portionSize,
          portion_size: portionSize,
          portionUnit,
          portion_unit: portionUnit,
          wasteBufferPercent,
          waste_buffer_percent: wasteBufferPercent,
          recipeYield: safeSelectedRecipeYield,
          recipe_yield: safeSelectedRecipeYield,
          batchCount: calculatedBatchCount,
          batch_count: calculatedBatchCount,
          roundedBatchCount: calculatedKitchenBatches,
          rounded_batch_count: calculatedKitchenBatches,
          station: selectedStation,
          prepStation: selectedStation,
          prep_station: selectedStation,
        }),
      });

      const data = (await response.json()) as AddRecipeResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to add recipe to event.");
      }

      setSuccessMessage("Recipe added to event menu.");
      await loadEventLines();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong adding recipe.";

      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function updateLineStation(
    lineId: string,
    station: string,
  ): Promise<void> {
    setLineSavingId(lineId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/events/${eventId}/recipe-lines`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineId,
          id: lineId,
          station,
          prepStation: station,
          prep_station: station,
        }),
      });

      const data = (await response.json()) as PatchLineResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to update station.");
      }

      setEventLines((currentLines) =>
        currentLines.map((line) =>
          line.id === lineId ? { ...line, station } : line,
        ),
      );

      setSuccessMessage("Station updated.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong updating station.";

      setError(message);
    } finally {
      setLineSavingId("");
    }
  }

  async function updateLinePrepStatus(
    lineId: string,
    prepStatus: PrepStatus,
  ): Promise<void> {
    setLineSavingId(lineId);
    setError("");
    setSuccessMessage("");

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

      const data = (await response.json()) as PatchLineResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to update prep status.");
      }

      setEventLines((currentLines) =>
        currentLines.map((line) =>
          line.id === lineId ? { ...line, prepStatus } : line,
        ),
      );

      setSuccessMessage("Prep status updated.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong updating prep status.";

      setError(message);
    } finally {
      setLineSavingId("");
    }
  }

  async function deleteEventLine(lineId: string): Promise<void> {
    setLineSavingId(lineId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/events/${eventId}/recipe-lines`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineId,
          id: lineId,
        }),
      });

      const data = (await response.json()) as DeleteLineResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete event recipe.");
      }

      await loadEventLines();
      setSuccessMessage("Recipe removed from event menu.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong deleting recipe.";

      setError(message);
    } finally {
      setLineSavingId("");
    }
  }

  return (
    <main
      suppressHydrationWarning
      className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-8"
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#a05a2c]">
                Event Detail
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#111827]">
                Catering Event Menu + Profit
              </h1>

              <p className="mt-2 text-sm text-[#64748b]">Event ID: {eventId}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/events"
                className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-bold text-[#111827]"
              >
                Back To Events
              </Link>

              <Link
                href={`/events/${eventId}/kitchen-packet`}
                className="rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white"
              >
                Open Kitchen Packet
              </Link>
            </div>
          </div>

          {loading ? (
            <p className="mt-5 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm font-semibold text-[#64748b]">
              Loading event...
            </p>
          ) : null}

          {successMessage ? (
            <p className="mt-5 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h2 className="text-2xl font-black text-[#111827]">
                Add Recipe To Event
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Choose a clean recipe, assign station, calculate prep portions,
                then send it to kitchen packet.
              </p>
            </div>

            <div className="rounded-2xl bg-[#fbf7ef] px-5 py-3 text-sm font-bold text-[#111827]">
              Showing {filteredRecipes.length} of {recipes.length}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Search Recipes
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Type salmon, chicken, rice..."
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">Category</span>
              <select
                suppressHydrationWarning
                value={categoryFilter}
                onChange={handleCategoryChange}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Select Recipe
              </span>
              <select
                suppressHydrationWarning
                value={selectedRecipeId}
                onChange={(event) => setSelectedRecipeId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="">Select recipe</option>
                {filteredRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} — {recipe.category} —{" "}
                    {formatCurrency(recipe.foodCost)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Guest Count
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                value={guestCount}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                % Eating This Recipe
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                max="100"
                value={percentEating}
                onChange={(event) =>
                  setPercentEating(Number(event.target.value))
                }
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Manual Portions Override
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                value={manualPortionsOverride}
                onChange={(event) =>
                  setManualPortionsOverride(event.target.value)
                }
                placeholder="Optional"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">Station</span>
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
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Portion Size
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                step="0.01"
                value={portionSize}
                onChange={(event) => setPortionSize(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Portion Unit
              </span>
              <select
                suppressHydrationWarning
                value={portionUnit}
                onChange={(event) => setPortionUnit(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="portion">portion</option>
                <option value="oz">oz</option>
                <option value="lb">lb</option>
                <option value="tray">tray</option>
                <option value="pan">pan</option>
                <option value="piece">piece</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-[#374151]">
                Waste Buffer %
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                value={wasteBufferPercent}
                onChange={(event) =>
                  setWasteBufferPercent(Number(event.target.value))
                }
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">
                Customer Portions
              </p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {calculatedCustomerPortions}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Kitchen Prep</p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {calculatedPrepPortions}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Recipe Yield</p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {safeSelectedRecipeYield}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Batch Count</p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {calculatedBatchCount.toFixed(2)}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">
                Kitchen Batches
              </p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {calculatedKitchenBatches}
              </p>
            </div>
          </div>

          {selectedRecipe ? (
            <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <div className="grid gap-3 text-sm md:grid-cols-5">
                <p>
                  <span className="block font-bold text-[#64748b]">Name</span>
                  <span className="font-black text-[#111827]">
                    {selectedRecipe.name}
                  </span>
                </p>

                <p>
                  <span className="block font-bold text-[#64748b]">
                    Category
                  </span>
                  <span className="font-black text-[#111827]">
                    {selectedRecipe.category}
                  </span>
                </p>

                <p>
                  <span className="block font-bold text-[#64748b]">
                    Recipe Food Cost
                  </span>
                  <span className="font-black text-[#111827]">
                    {formatCurrency(selectedRecipe.foodCost)}
                  </span>
                </p>

                <p>
                  <span className="block font-bold text-[#64748b]">
                    Selling Price
                  </span>
                  <span className="font-black text-[#111827]">
                    {formatCurrency(selectedRecipe.sellingPrice)}
                  </span>
                </p>

                <p>
                  <span className="block font-bold text-[#64748b]">Margin</span>
                  <span className="font-black text-[#111827]">
                    {formatPercent(selectedRecipe.marginPercent)}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-800">
              No matching recipe selected. Change category to All or clear the
              search box.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              suppressHydrationWarning
              type="button"
              disabled={saving || !selectedRecipe}
              onClick={() => void addRecipeToEvent()}
              className="rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add Recipe To Event Menu"}
            </button>

            <Link
              href={`/events/${eventId}/kitchen-packet`}
              className="rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-bold text-[#111827]"
            >
              Open Kitchen Packet
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Revenue</p>
            <p className="mt-3 text-3xl font-black text-[#111827]">
              {formatCurrency(eventProfit.revenue)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">Food Cost</p>
            <p className="mt-3 text-3xl font-black text-[#111827]">
              {formatCurrency(eventProfit.foodCost)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">
              Food-Only Margin
            </p>
            <p className="mt-3 text-3xl font-black text-green-700">
              {formatPercent(eventProfit.margin)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#64748b]">New Item Preview</p>
            <p className="mt-3 text-xl font-black text-[#111827]">
              {formatCurrency(calculatedRevenue)}
            </p>
            <p className="mt-1 text-xs font-bold text-[#64748b]">
              Cost {formatCurrency(calculatedFoodCost)} · Margin{" "}
              {formatPercent(calculatedMargin)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black text-[#111827]">
                Event Menu Builder
              </h2>
              <p className="mt-2 text-sm text-[#64748b]">
                Charge customer portions. Prep kitchen portions with buffer.
              </p>
            </div>

            <div className="rounded-2xl bg-[#fbf7ef] px-5 py-3 text-sm font-bold text-[#111827]">
              Menu Food Cost: {formatCurrency(eventProfit.foodCost)}
            </div>
          </div>

          {eventLines.length > 0 ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[1400px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#64748b]">
                  <tr>
                    <th className="px-4 py-3 font-bold">Recipe</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Customer</th>
                    <th className="px-4 py-3 font-bold">Kitchen Prep</th>
                    <th className="px-4 py-3 font-bold">Yield</th>
                    <th className="px-4 py-3 font-bold">Batch Count</th>
                    <th className="px-4 py-3 font-bold">Kitchen Batches</th>
                    <th className="px-4 py-3 font-bold">Portion</th>
                    <th className="px-4 py-3 font-bold">Buffer</th>
                    <th className="px-4 py-3 font-bold">Food Cost</th>
                    <th className="px-4 py-3 font-bold">Quote Price</th>
                    <th className="px-4 py-3 font-bold">Station</th>
                    <th className="px-4 py-3 font-bold">Prep Status</th>
                    <th className="px-4 py-3 font-bold">Delete</th>
                  </tr>
                </thead>

                <tbody>
                  {eventLines.map((line) => (
                    <tr key={line.id} className="border-t border-[#eadfce]">
                      <td className="px-4 py-3 font-black text-[#111827]">
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
                        <span className="block text-xs text-[#64748b]">
                          {line.requiredFoodAmount.toFixed(2)}{" "}
                          {line.portionUnit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.recipeYield}
                        <span className="block text-xs text-[#64748b]">
                          portions
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.batchCount.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 font-black text-[#111827]">
                        {line.roundedBatchCount}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.portionSize} {line.portionUnit}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {line.wasteBufferPercent}%
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {formatCurrency(line.totalCost)}
                      </td>

                      <td className="px-4 py-3 text-[#111827]">
                        {formatCurrency(line.sellingPrice)}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          suppressHydrationWarning
                          value={line.station}
                          disabled={lineSavingId === line.id}
                          onChange={(event) =>
                            void updateLineStation(line.id, event.target.value)
                          }
                          className="rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-xs font-bold text-[#111827]"
                        >
                          {stationOptions.map((station) => (
                            <option key={station} value={station}>
                              {station}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          suppressHydrationWarning
                          value={line.prepStatus}
                          disabled={lineSavingId === line.id}
                          onChange={(event) =>
                            void updateLinePrepStatus(
                              line.id,
                              readPrepStatus(event.target.value),
                            )
                          }
                          className="rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-xs font-bold text-[#111827]"
                        >
                          {prepStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <button
                          suppressHydrationWarning
                          type="button"
                          disabled={lineSavingId === line.id}
                          onClick={() => void deleteEventLine(line.id)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#64748b]">
              No recipes added yet. Add a clean recipe above, then open Kitchen
              Packet.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-[#111827]">
            Quick Kitchen Packet Check
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Menu Items</p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {eventLines.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Stations</p>
              <p className="mt-2 text-3xl font-black text-[#111827]">
                {
                  Array.from(
                    new Set(eventLines.map((line) => line.station)),
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Blocked Items</p>
              <p className="mt-2 text-3xl font-black text-red-700">
                {
                  eventLines.filter((line) => line.prepStatus === "Blocked")
                    .length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-bold text-[#64748b]">Ready?</p>
              <p className="mt-2 text-xl font-black text-[#111827]">
                {eventLines.length > 0 ? "Open Packet" : "Add Recipe"}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={`/events/${eventId}/kitchen-packet`}
              className="inline-flex rounded-2xl bg-[#111827] px-5 py-3 text-sm font-bold text-white"
            >
              Open Kitchen Packet
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}