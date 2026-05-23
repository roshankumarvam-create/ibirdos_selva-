"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type EventProfit = {
  revenue: number;
  foodCost: number;
  margin: number;
};

type Recipe = {
  id: string;
  name: string;
  category: string;
  servings: number;
  sellingPrice: number;
  foodCost: number;
  margin: number;
};

type EventMenuLine = {
  id: string;
  recipeId: string;
  recipeName: string;
  category: string;
  guestCount: number;
  eaterPercentage: number;
  customerPortions: number;
  prepPortions: number;
  portionSize: number;
  portionUnit: string;
  wasteBufferPercent: number;
  requiredFoodAmount: number;
  totalCost: number;
  sellingPrice: number;
  station: string;
  prepStatus: string;
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

type RecipesResponse = {
  success?: boolean;
  recipes?: unknown[];
  data?: unknown[];
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
  snapshot?: unknown;
  error?: string;
};

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

function normalizeRecipe(value: unknown): Recipe | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");
  const name = readString(value.name ?? value.recipe_name ?? value.recipeName, "");
  const category = readString(value.category ?? value.recipe_category, "Other");

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    category,
    servings: readNumber(value.servings ?? value.serving_count ?? value.yield, 1),
    sellingPrice: readNumber(
      value.sellingPrice ?? value.selling_price ?? value.pricePerServing,
      0,
    ),
    foodCost: readNumber(
      value.foodCost ??
        value.food_cost ??
        value.totalFoodCost ??
        value.total_food_cost ??
        value.totalCost ??
        value.total_cost,
      0,
    ),
    margin: readNumber(value.margin ?? value.marginPercent ?? value.margin_percent, 0),
  };
}

function normalizeRecipesResponse(value: unknown): Recipe[] {
  if (!isRecord(value)) {
    return [];
  }

  const response = value as RecipesResponse;
  const source = Array.isArray(response.recipes)
    ? response.recipes
    : Array.isArray(response.data)
      ? response.data
      : [];

  return source
    .map((item) => normalizeRecipe(item))
    .filter((recipe): recipe is Recipe => recipe !== null);
}

function normalizeEventMenuLine(value: unknown): EventMenuLine | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id, "");
  const recipeId = readString(value.recipeId ?? value.recipe_id, "");
  const recipeName = readString(
    value.recipeName ?? value.recipe_name ?? value.name,
    "Unnamed Recipe",
  );

  if (!id) {
    return null;
  }

  return {
    id,
    recipeId,
    recipeName,
    category: readString(
      value.category ?? value.recipeCategory ?? value.recipe_category,
      "Uncategorized",
    ),
    guestCount: readNumber(value.guestCount ?? value.guest_count, 0),
    eaterPercentage: readNumber(
      value.eaterPercentage ?? value.eater_percentage,
      100,
    ),
    customerPortions: readNumber(
      value.customerPortions ?? value.customer_portions,
      0,
    ),
    prepPortions: readNumber(value.prepPortions ?? value.prep_portions, 0),
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
    station: readString(value.station, "Unassigned"),
    prepStatus: readString(value.prepStatus ?? value.prep_status, "Not Started"),
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

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipesLoading, setRecipesLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [snapshotSaving, setSnapshotSaving] = useState<boolean>(false);

  const [searchText, setSearchText] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");

  const [guestCount, setGuestCount] = useState<number>(250);
  const [eaterPercentage, setEaterPercentage] = useState<number>(100);
  const [manualServings, setManualServings] = useState<number | null>(null);

  const [portionSize, setPortionSize] = useState<number>(1);
  const [portionUnit, setPortionUnit] = useState<string>("portion");
  const [wasteBufferPercent, setWasteBufferPercent] = useState<number>(10);

  const [laborCost, setLaborCost] = useState<number>(45);
  const [packagingCost, setPackagingCost] = useState<number>(12);
  const [deliveryCost, setDeliveryCost] = useState<number>(20);
  const [otherCost, setOtherCost] = useState<number>(0);

  const [eventProfit, setEventProfit] = useState<EventProfit>({
    revenue: 0,
    foodCost: 0,
    margin: 0,
  });
  const [eventMenuLines, setEventMenuLines] = useState<EventMenuLine[]>([]);
  const [profitSnapshots, setProfitSnapshots] = useState<ProfitSnapshot[]>([]);
  const [error, setError] = useState<string>("");

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(recipes.map((recipe) => recipe.category || "Other")),
    );

    return ["All", ...uniqueCategories.sort()];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const cleanSearch = searchText.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const matchesCategory =
        selectedCategory === "All" || recipe.category === selectedCategory;

      const matchesSearch =
        cleanSearch.length === 0 ||
        recipe.name.toLowerCase().includes(cleanSearch) ||
        recipe.category.toLowerCase().includes(cleanSearch);

      return matchesCategory && matchesSearch;
    });
  }, [recipes, searchText, selectedCategory]);

  const selectedRecipe =
    filteredRecipes.find((recipe) => recipe.id === selectedRecipeId) ??
    filteredRecipes[0] ??
    null;

  const customerPortions = Math.max(
    1,
    manualServings ?? Math.round((guestCount * eaterPercentage) / 100),
  );

  const prepPortions = Math.max(
    1,
    Math.ceil(customerPortions * (1 + wasteBufferPercent / 100)),
  );

  const requiredFoodAmount = prepPortions * portionSize;

  const displayedRevenue = eventProfit.revenue;
  const displayedFoodCost = eventProfit.foodCost;
  const displayedMargin = eventProfit.margin;

  const latestSnapshot = profitSnapshots[0] ?? null;

  const loadedTotalCost =
    displayedFoodCost + laborCost + packagingCost + deliveryCost + otherCost;

  const loadedGrossProfit = displayedRevenue - loadedTotalCost;

  const loadedMargin =
    displayedRevenue > 0 ? (loadedGrossProfit / displayedRevenue) * 100 : 0;

  async function loadRecipes(): Promise<void> {
    setRecipesLoading(true);

    try {
      const response = await fetch("/api/recipes", { cache: "no-store" });
      const data = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error("Failed to load recipes.");
      }

      const normalizedRecipes = normalizeRecipesResponse(data);
      setRecipes(normalizedRecipes);

      if (normalizedRecipes.length > 0) {
        setSelectedRecipeId(normalizedRecipes[0].id);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong loading recipes.";

      setError(message);
    } finally {
      setRecipesLoading(false);
    }
  }

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

  useEffect(() => {
    void loadRecipes();
  }, []);

  useEffect(() => {
    void loadEventMenuLines();
    void loadProfitSnapshots();
  }, [eventId]);

  useEffect(() => {
    if (filteredRecipes.length === 0) {
      setSelectedRecipeId("");
      return;
    }

    const selectedRecipeStillVisible = filteredRecipes.some(
      (recipe) => recipe.id === selectedRecipeId,
    );

    if (!selectedRecipeStillVisible) {
      setSelectedRecipeId(filteredRecipes[0].id);
    }
  }, [filteredRecipes, selectedRecipeId]);

  async function handleAddRecipeToEvent(): Promise<void> {
    if (!selectedRecipe) {
      setError("Select a recipe first.");
      return;
    }

    const alreadyAdded = eventMenuLines.some(
      (line) => line.recipeId === selectedRecipe.id,
    );

    if (alreadyAdded) {
      setError("This recipe is already added. Delete it first or edit servings.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${eventId}/recipe-lines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId: selectedRecipe.id,
          guestCount,
          eaterPercentage,
          customerPortions,
          prepPortions,
          servings: prepPortions,
          portionSize,
          portionUnit,
          wasteBufferPercent,
          requiredFoodAmount,
          sellingPrice: selectedRecipe.sellingPrice,
        }),
      });

      const data = (await response.json()) as EventLinesResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to add recipe to event.");
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
      setManualServings(null);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Something went wrong.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteMenuLine(lineId: string): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/events/${eventId}/recipe-lines?lineId=${lineId}`,
        {
          method: "DELETE",
        },
      );

      const data = (await response.json()) as EventLinesResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to delete recipe line.");
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
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Something went wrong.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfitSnapshot(): Promise<void> {
    setSnapshotSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${eventId}/profit-snapshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          laborCost,
          packagingCost,
          deliveryCost,
          otherCost,
          snapshotType: "event_page",
          notes: "Saved from event profit page",
        }),
      });

      const data = (await response.json()) as SnapshotResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to save profit snapshot.");
      }

      await loadProfitSnapshots();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Something went wrong.";

      setError(message);
    } finally {
      setSnapshotSaving(false);
    }
  }

  return (
    <main
      suppressHydrationWarning
      className="min-h-screen bg-[#f8f4ec] px-4 py-6 md:px-6 md:py-8"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#a05a2c]">
            Event Detail
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#1f2937]">
            Catering Event Menu + Profit
          </h1>

          <p className="mt-2 text-sm text-[#6b7280]">Event ID: {eventId}</p>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-[#374151]">
                Search Restaurant Recipes
              </span>
              <input
                suppressHydrationWarning
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search chicken, paneer, pasta, appetizer..."
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Category
              </span>
              <select
                suppressHydrationWarning
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Select Recipe
              </span>
              <select
                suppressHydrationWarning
                value={selectedRecipe?.id ?? ""}
                onChange={(event) => setSelectedRecipeId(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                {recipesLoading ? <option value="">Loading recipes...</option> : null}

                {!recipesLoading && filteredRecipes.length === 0 ? (
                  <option value="">No recipes found</option>
                ) : null}

                {filteredRecipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Guest Count
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="1"
                value={guestCount}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                % Eating This Recipe
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="1"
                max="100"
                value={eaterPercentage}
                onChange={(event) => setEaterPercentage(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Manual Portions Override
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="1"
                value={manualServings ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setManualServings(value ? Number(value) : null);
                }}
                placeholder="Optional"
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] px-4 py-3">
              <p className="text-sm font-semibold text-[#6b7280]">
                Customer Portions
              </p>
              <p className="mt-2 text-2xl font-bold text-[#111827]">
                {customerPortions}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Portion Size
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0.01"
                step="0.01"
                value={portionSize}
                onChange={(event) => setPortionSize(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Portion Unit
              </span>
              <select
                suppressHydrationWarning
                value={portionUnit}
                onChange={(event) => setPortionUnit(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              >
                <option value="portion">portion</option>
                <option value="piece">piece</option>
                <option value="oz">oz</option>
                <option value="lb">lb</option>
                <option value="cup">cup</option>
                <option value="quart">quart</option>
                <option value="tray">tray</option>
                <option value="pan">pan</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Waste Buffer %
              </span>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                max="100"
                value={wasteBufferPercent}
                onChange={(event) =>
                  setWasteBufferPercent(Number(event.target.value))
                }
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] px-4 py-3">
              <p className="text-sm font-semibold text-[#6b7280]">
                Kitchen Prep Portions
              </p>
              <p className="mt-2 text-2xl font-bold text-[#111827]">
                {prepPortions}
              </p>
              <p className="mt-1 text-xs text-[#6b7280]">
                {requiredFoodAmount.toFixed(2)} {portionUnit} total
              </p>
            </div>
          </div>

          {selectedRecipe ? (
            <div className="mt-5 rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <div className="grid gap-3 text-sm md:grid-cols-4">
                <p>
                  <span className="font-semibold">Name:</span>{" "}
                  {selectedRecipe.name}
                </p>
                <p>
                  <span className="font-semibold">Category:</span>{" "}
                  {selectedRecipe.category}
                </p>
                <p>
                  <span className="font-semibold">Selling Price:</span>{" "}
                  {formatCurrency(selectedRecipe.sellingPrice)}
                </p>
                <p>
                  <span className="font-semibold">Food Cost:</span>{" "}
                  {formatCurrency(selectedRecipe.foodCost)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              suppressHydrationWarning
              type="button"
              onClick={handleAddRecipeToEvent}
              disabled={loading || recipesLoading || !selectedRecipe}
              className="rounded-2xl bg-[#1f2937] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add Recipe To Event Menu"}
            </button>

            <Link
              href={`/events/${eventId}/kitchen-packet`}
              className="inline-flex rounded-2xl border border-[#eadfce] bg-white px-5 py-3 text-sm font-semibold text-[#111827]"
            >
              Open Kitchen Packet
            </Link>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">Revenue</p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {formatCurrency(displayedRevenue)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">Food Cost</p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {formatCurrency(displayedFoodCost)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Food-Only Margin
            </p>
            <p className="mt-3 text-3xl font-bold text-green-700">
              {formatPercent(displayedMargin)}
            </p>
          </div>

          <div className="rounded-3xl border border-[#eadfce] bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-[#6b7280]">
              Loaded Margin
            </p>
            <p className="mt-3 text-3xl font-bold text-[#111827]">
              {latestSnapshot
                ? formatPercent(latestSnapshot.marginPercent)
                : formatPercent(loadedMargin)}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                Loaded Event Profit Snapshot
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Adds labor, packaging, delivery, and other costs to show true
                event margin.
              </p>
            </div>

            <button
              suppressHydrationWarning
              type="button"
              onClick={handleSaveProfitSnapshot}
              disabled={snapshotSaving}
              className="rounded-2xl bg-[#002515] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {snapshotSaving ? "Saving..." : "Save Profit Snapshot"}
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Labor Cost
              </span>
              <input
                type="number"
                min="0"
                value={laborCost}
                onChange={(event) => setLaborCost(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Packaging Cost
              </span>
              <input
                type="number"
                min="0"
                value={packagingCost}
                onChange={(event) => setPackagingCost(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Delivery Cost
              </span>
              <input
                type="number"
                min="0"
                value={deliveryCost}
                onChange={(event) => setDeliveryCost(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[#374151]">
                Other Cost
              </span>
              <input
                type="number"
                min="0"
                value={otherCost}
                onChange={(event) => setOtherCost(Number(event.target.value))}
                className="mt-2 w-full rounded-2xl border border-[#eadfce] px-4 py-3 text-sm outline-none"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-semibold text-[#6b7280]">Total Cost</p>
              <p className="mt-2 text-2xl font-bold text-[#111827]">
                {formatCurrency(
                  latestSnapshot ? latestSnapshot.totalCost : loadedTotalCost,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-semibold text-[#6b7280]">
                Gross Profit
              </p>
              <p className="mt-2 text-2xl font-bold text-[#111827]">
                {formatCurrency(
                  latestSnapshot
                    ? latestSnapshot.grossProfit
                    : loadedGrossProfit,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-semibold text-[#6b7280]">
                Loaded Margin
              </p>
              <p className="mt-2 text-2xl font-bold text-green-700">
                {formatPercent(
                  latestSnapshot ? latestSnapshot.marginPercent : loadedMargin,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-[#eadfce] bg-[#fbf7ef] p-4">
              <p className="text-sm font-semibold text-[#6b7280]">
                Last Snapshot
              </p>
              <p className="mt-2 text-sm font-bold text-[#111827]">
                {latestSnapshot
                  ? latestSnapshot.snapshotType
                  : "No snapshot saved yet"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#eadfce] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">
                Event Menu Builder
              </h2>
              <p className="mt-1 text-sm text-[#6b7280]">
                Charge customer portions. Prep kitchen portions with buffer.
              </p>
            </div>

            <div className="rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm">
              <span className="font-semibold">Menu Food Cost:</span>{" "}
              {formatCurrency(displayedFoodCost)}
            </div>
          </div>

          {eventMenuLines.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#eadfce]">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-[#fbf7ef] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Recipe</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Kitchen Prep</th>
                    <th className="px-4 py-3 font-semibold">Portion</th>
                    <th className="px-4 py-3 font-semibold">Buffer</th>
                    <th className="px-4 py-3 font-semibold">Food Cost</th>
                    <th className="px-4 py-3 font-semibold">Quote Price</th>
                    <th className="px-4 py-3 font-semibold">Station</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
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
                        {line.portionSize} {line.portionUnit}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.wasteBufferPercent}%
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatCurrency(line.totalCost)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {formatCurrency(line.sellingPrice * line.customerPortions)}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.station}
                      </td>
                      <td className="px-4 py-3 text-[#111827]">
                        {line.prepStatus}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void handleDeleteMenuLine(line.id)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
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
            <p className="mt-4 rounded-2xl bg-[#fbf7ef] px-4 py-3 text-sm text-[#6b7280]">
              No menu items added yet. Search a recipe, set percentage eating,
              portion size, and buffer, then add it to the event menu.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}