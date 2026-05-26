"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type RecipeRole = "OWNER" | "MANAGER" | "CHEF" | "KITCHEN_STAFF" | "DRIVER" | "CLIENT" | string;

type RecipeRow = {
  id: string;
  name: string | null;
  category: string | null;
  servings: string | number | null;
  selling_price: string | number | null;
  total_food_cost: string | number | null;
  cost_per_serving: string | number | null;
  margin_percent: string | number | null;
  prep_time_minutes: string | number | null;
  cook_time_minutes: string | number | null;
  portion_weight: string | number | null;
  portion_unit: string | null;
  source_type: string | null;
  ingredient_count: string | number | null;
  updated_at: string | null;
};

type RecipesApiResponse = {
  success?: boolean;
  recipes?: RecipeRow[];
  data?: RecipeRow[];
  role?: RecipeRole;
  canCreateRecipe?: boolean;
  canEditRecipe?: boolean;
  canPrintRecipe?: boolean;
  error?: string;
};

type DeleteRecipeResponse = { 
  success: boolean;
  deletedRecipeId?: string; 
  deletedRecipeName?: string | null;
  error?: string
};

const categoryOptions = [
  "All",
  "Appetizer",
  "Entree",
  "Side",
  "Dessert",
  "Sauce",
  "Beverage",
  "Other",
];

const marginOptions = [
  { label: "All margins", value: "" },
  { label: "Low margin only", value: "low" },
];

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function formatCurrency(value: string | number | null | undefined): string {
  return toNumber(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatPercent(value: string | number | null | undefined): string {
  return `${toNumber(value).toFixed(2)}%`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getRecipesFromResponse(response: RecipesApiResponse): RecipeRow[] {
  return response.recipes ?? response.data ?? [];
}

function getMarginStatus(margin: string | number | null | undefined): {
  label: string;
  className: string;
} {
  const marginValue = toNumber(margin);

  if (marginValue <= 0) {
    return {
      label: "Needs price",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  if (marginValue < 30) {
    return {
      label: "Low margin",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (marginValue < 60) {
    return {
      label: "Watch",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Good margin",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

export default function RecipesPage() {
  const [deletingRecipeId, setDeletingRecipeId] = useState<string>("");
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [role, setRole] = useState<RecipeRole>("");
  const [canCreateRecipe, setCanCreateRecipe] = useState<boolean>(false);
  const [canEditRecipe, setCanEditRecipe] = useState<boolean>(false);
  const [canPrintRecipe, setCanPrintRecipe] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("All");
  const [marginFilter, setMarginFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const filteredRecipes = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return recipes.filter((recipe) => {
      const recipeName = recipe.name?.toLowerCase() ?? "";
      const recipeCategory = recipe.category ?? "Other";
      const matchesSearch = searchText.length === 0 || recipeName.includes(searchText);
      const matchesCategory = category === "All" || recipeCategory === category;
      const matchesMargin =
        marginFilter !== "low" || toNumber(recipe.margin_percent) < 30;

      return matchesSearch && matchesCategory && matchesMargin;
    });
  }, [recipes, search, category, marginFilter]);

  const stats = useMemo(() => {
    const totalRecipes = recipes.length;
    const lowMarginRecipes = recipes.filter(
      (recipe) =>
        toNumber(recipe.margin_percent) > 0 && toNumber(recipe.margin_percent) < 30,
    ).length;
    const averageMargin =
      recipes.length > 0
        ? recipes.reduce((sum, recipe) => sum + toNumber(recipe.margin_percent), 0) /
          recipes.length
        : 0;
    const totalFoodCost = recipes.reduce(
      (sum, recipe) => sum + toNumber(recipe.total_food_cost),
      0,
    );

    return {
      totalRecipes,
      lowMarginRecipes,
      averageMargin,
      totalFoodCost,
    };
  }, [recipes]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipes(): Promise<void> {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/recipes", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as RecipesApiResponse;

        if (!response.ok || data.success === false) {
          throw new Error(data.error ?? "Recipes could not be loaded.");
        }

        if (isMounted) {
          setRecipes(getRecipesFromResponse(data));
          setRole(data.role ?? "");
          setCanCreateRecipe(Boolean(data.canCreateRecipe));
          setCanEditRecipe(Boolean(data.canEditRecipe));
          setCanPrintRecipe(Boolean(data.canPrintRecipe));
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Recipes could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipes();

    return () => {
      isMounted = false;
    };
  }, []);

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setSearch(event.target.value);
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>): void {
    setCategory(event.target.value);
  }

  function handleMarginFilterChange(event: ChangeEvent<HTMLSelectElement>): void {
    setMarginFilter(event.target.value);
  }

  async function deleteRecipe(recipeId: string, recipeName: string): Promise<void> {
  const confirmed = window.confirm(
    `Delete "${recipeName}"? This cannot be undone.`,
  );

  if (!confirmed) {
    return;
  }

  setDeletingRecipeId(recipeId);
  setError("");
  postMessage("");

  try {
    const response = await fetch(`/api/recipes/${recipeId}/delete`, {
      method: "DELETE",
    });

    const responseText = await response.text();

    const data: DeleteRecipeResponse = responseText.trim().length > 0 
    ? (JSON.parse(responseText) as DeleteRecipeResponse)
    : {
       success: false, 
       error: "Delete API returned empty response.",
       };
       
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? "Recipe could not be deleted.");
    }

    setRecipes((currentRecipes) =>
      currentRecipes.filter((recipe) => recipe.id !== recipeId),
    );

    postMessage("Recipe deleted successfully.");
  } catch (caughtError) {
    const messageText =
      caughtError instanceof Error
        ? caughtError.message
        : "Recipe could not be deleted.";

    setError(messageText);
  } finally {
    setDeletingRecipeId("");
  }
}
  return (
    <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
              Recipe Library
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Recipe Costing Center
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Search recipes, review food cost, open editable recipe cards, and
              print chef-ready recipe PDFs.
            </p>

            {role ? (
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Current role: {role}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {canCreateRecipe ? (
              <>
                <Link
                  href="/recipes/new"
                  className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
                >
                  Manual Create Recipe
                </Link>

                <Link
                  href="/recipes/import"
                  className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
                >
                  Upload Recipe
                </Link>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-600">
                View / print access only
              </div>
            )}
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.5rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Total Recipes
            </p>
            <p className="mt-2 text-4xl font-black">{stats.totalRecipes}</p>
          </div>

          <div className="rounded-[1.5rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Average Margin
            </p>
            <p className="mt-2 text-4xl font-black">
              {formatPercent(stats.averageMargin)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Low Margin
            </p>
            <p className="mt-2 text-4xl font-black">{stats.lowMarginRecipes}</p>
          </div>

          <div className="rounded-[1.5rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Total Food Cost
            </p>
            <p className="mt-2 text-4xl font-black">
              {formatCurrency(stats.totalFoodCost)}
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Search Recipe
              </label>
              <input
                suppressHydrationWarning
                value={search}
                onChange={handleSearchChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="Search by recipe name..."
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Category
              </label>
              <select
                suppressHydrationWarning
                value={category}
                onChange={handleCategoryChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              >
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Margin Filter
              </label>
              <select
                suppressHydrationWarning
                value={marginFilter}
                onChange={handleMarginFilterChange}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              >
                {marginOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
                Library
              </p>
              <h2 className="text-2xl font-black">Recipes</h2>
            </div>

            <p className="text-sm font-semibold text-slate-500">
              Showing {filteredRecipes.length} of {recipes.length}
            </p>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-[#fffdf8] p-6 text-sm font-bold">
              Loading recipes...
            </div>
          ) : null}

          {!isLoading && filteredRecipes.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-[#fffdf8] p-6">
              <h3 className="text-xl font-black">No recipes found</h3>
              <p className="mt-2 text-sm text-slate-600">
                Create or import your first recipe to start tracking food cost.
              </p>

              {canCreateRecipe ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/recipes/new"
                    className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
                  >
                    Manual Create Recipe
                  </Link>

                  <Link
                    href="/recipes/import"
                    className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
                  >
                    Upload Recipe
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}

          {!isLoading && filteredRecipes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    <th className="px-4 py-2">Recipe</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Servings</th>
                    <th className="px-4 py-2">Food Cost</th>
                    <th className="px-4 py-2">Cost/Serving</th>
                    <th className="px-4 py-2">Selling Price</th>
                    <th className="px-4 py-2">Margin</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Updated</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecipes.map((recipe) => {
                    const marginStatus = getMarginStatus(recipe.margin_percent);

                    return (
                      <tr key={recipe.id} className="rounded-3xl bg-[#fffdf8]">
                        <td className="rounded-l-3xl border-y border-l border-slate-200 px-4 py-4">
                          <p className="font-black text-[#052e1c]">
                            {recipe.name || "Untitled Recipe"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {toNumber(recipe.ingredient_count)} ingredients •{" "}
                            {recipe.source_type || "manual"}
                          </p>
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-sm font-semibold">
                          {recipe.category || "Other"}
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-sm font-semibold">
                          {toNumber(recipe.servings)}
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-sm font-black">
                          {formatCurrency(recipe.total_food_cost)}
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-sm font-black">
                          {formatCurrency(recipe.cost_per_serving)}
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-sm font-black">
                          {formatCurrency(recipe.selling_price)}
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-sm font-black">
                          {formatPercent(recipe.margin_percent)}
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-2 text-xs font-black ${marginStatus.className}`}
                          >
                            {marginStatus.label}
                          </span>
                        </td>

                        <td className="border-y border-slate-200 px-4 py-4 text-xs font-semibold text-slate-500">
                          {formatDate(recipe.updated_at)}
                        </td>

                        <td className="rounded-r-3xl border-y border-r border-slate-200 px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            {canEditRecipe ? (
                              <Link
                                href={`/recipes/${recipe.id}`}
                                className="rounded-full bg-[#052e1c] px-4 py-2 text-xs font-black text-white"
                              >
                                Open
                              </Link>
                            ) : null}

                            {canPrintRecipe ? ( 
                              <> 
                               <Link 
                                  href={`/recipes/${recipe.id}/print`} 
                                  className="rounded-full border border-[#052e1c] px-4 py-2 text-xs font-black text-[#052e1c]"
                              > 
                                Print PDF 
                              </Link> 

                              <button 
                                 suppressHydrationWarning 
                                 type="button" 
                                 disabled={deletingRecipeId === recipe.id} 
                                 onClick={(event) => { 
                                 event.preventDefault(); 
                                 event.stopPropagation(); 
                                 void deleteRecipe(recipe.id, recipe.name ?? "Untitled Recipe"); 
                               }} 
                                className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" 
                               > 
                                {deletingRecipeId === recipe.id ? "Deleting..." : "Delete"} 
                                </button> 
                              </> // 
                            ) : null} 
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}