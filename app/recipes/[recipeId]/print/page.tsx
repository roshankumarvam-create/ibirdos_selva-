"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type RecipeIngredientRow = {
  id: string;
  raw_ingredient_name: string | null;
  ingredient_name: string | null;
  quantity: string | number | null;
  unit: string | null;
  cost_per_unit: string | number | null;
  line_cost: string | number | null;
  prep_note: string | null;
  sort_order: string | number | null;
};

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
  prep_photo_url: string | null;
  final_plate_photo_url: string | null;
  instructions: string | null;
  source_type: string | null;
  ingredients?: RecipeIngredientRow[];
  recipe_ingredients?: RecipeIngredientRow[];
};

type RecipeApiResponse = {
  success?: boolean;
  recipe?: RecipeRow;
  data?: RecipeRow;
  error?: string;
};

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

function getRecipeFromResponse(response: RecipeApiResponse): RecipeRow | null {
  return response.recipe ?? response.data ?? null;
}

function getIngredients(recipe: RecipeRow | null): RecipeIngredientRow[] {
  if (!recipe) {
    return [];
  }

  return recipe.ingredients ?? recipe.recipe_ingredients ?? [];
}

export default function RecipePrintPage() {
  const params = useParams<{ recipeId: string }>();
  const recipeId = params.recipeId;

  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const ingredients = useMemo(() => getIngredients(recipe), [recipe]);

  const calculatedTotals = useMemo(() => {
    const totalFoodCost =
      toNumber(recipe?.total_food_cost) > 0
        ? toNumber(recipe?.total_food_cost)
        : ingredients.reduce((sum, ingredient) => {
            const lineCost =
              toNumber(ingredient.line_cost) > 0
                ? toNumber(ingredient.line_cost)
                : toNumber(ingredient.quantity) * toNumber(ingredient.cost_per_unit);

            return sum + lineCost;
          }, 0);

    const servings = Math.max(toNumber(recipe?.servings), 1);
    const sellingPrice = toNumber(recipe?.selling_price);
    const costPerServing =
      toNumber(recipe?.cost_per_serving) > 0
        ? toNumber(recipe?.cost_per_serving)
        : totalFoodCost / servings;
    const profitPerServing = sellingPrice - costPerServing;
    const marginPercent =
      toNumber(recipe?.margin_percent) > 0
        ? toNumber(recipe?.margin_percent)
        : sellingPrice > 0
          ? (profitPerServing / sellingPrice) * 100
          : 0;

    return {
      totalFoodCost,
      costPerServing,
      sellingPrice,
      marginPercent,
    };
  }, [recipe, ingredients]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe(): Promise<void> {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/recipes/${recipeId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as RecipeApiResponse;

        if (!response.ok || data.success === false) {
          throw new Error(data.error ?? "Recipe could not be loaded.");
        }

        const loadedRecipe = getRecipeFromResponse(data);

        if (!loadedRecipe) {
          throw new Error("Recipe not found.");
        }

        if (isMounted) {
          setRecipe(loadedRecipe);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Recipe could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRecipe();

    return () => {
      isMounted = false;
    };
  }, [recipeId]);

  function handlePrint(): void {
    window.print();
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-white px-6 py-8 text-[#051f14]">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-bold">Loading recipe print sheet...</p>
        </div>
      </main>
    );
  }

  if (error || !recipe) {
    return (
      <main className="min-h-screen bg-white px-6 py-8 text-[#051f14]">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-bold text-red-700">
            {error || "Recipe not found."}
          </p>

          <Link
            href="/recipes"
            className="mt-4 inline-flex rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
          >
            Back to Recipes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-[#051f14] print:px-0 print:py-0">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .print-card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }

          .print-page {
            max-width: 100% !important;
            padding: 0.25in !important;
          }
        }
      `}</style>

      <div className="print-page mx-auto max-w-5xl">
        <section className="no-print mb-6 flex flex-col gap-3 border-b border-[#d8c8a7] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
              Recipe Print Sheet
            </p>
            <h1 className="mt-2 text-3xl font-black">Print Recipe</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/recipes"
              className="rounded-full border border-[#d8c8a7] px-5 py-3 text-sm font-bold text-[#052e1c]"
            >
              Back to Recipes
            </Link>

            <Link
              href={`/recipes/${recipe.id}`}
              className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
            >
              Edit
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full bg-[#111827] px-5 py-3 text-sm font-bold text-white"
            >
              Print
            </button>
          </div>
        </section>

        <section className="mb-6 border-b border-[#d8c8a7] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
            iBirdOS Recipe
          </p>

          <h2 className="mt-3 text-4xl font-black leading-tight">
            {recipe.name || "Untitled Recipe"}
          </h2>

          <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold text-slate-600">
            <span>Category: {recipe.category || "Other"}</span>
            <span>•</span>
            <span>Servings: {toNumber(recipe.servings)}</span>
            <span>•</span>
            <span>
              Prep: {toNumber(recipe.prep_time_minutes)} min
            </span>
            <span>•</span>
            <span>
              Cook: {toNumber(recipe.cook_time_minutes)} min
            </span>
          </div>

          {toNumber(recipe.portion_weight) > 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Portion: {toNumber(recipe.portion_weight)}{" "}
              {recipe.portion_unit || "oz"}
            </p>
          ) : null}
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="print-card rounded-2xl border border-[#d8c8a7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Servings
            </p>
            <p className="mt-2 text-2xl font-black">{toNumber(recipe.servings)}</p>
          </div>

          <div className="print-card rounded-2xl border border-[#d8c8a7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Food Cost
            </p>
            <p className="mt-2 text-2xl font-black">
              {formatCurrency(calculatedTotals.totalFoodCost)}
            </p>
          </div>

          <div className="print-card rounded-2xl border border-[#d8c8a7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Selling Price
            </p>
            <p className="mt-2 text-2xl font-black">
              {formatCurrency(calculatedTotals.sellingPrice)}
            </p>
          </div>

          <div className="print-card rounded-2xl border border-[#d8c8a7] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Margin
            </p>
            <p className="mt-2 text-2xl font-black">
              {formatPercent(calculatedTotals.marginPercent)}
            </p>
          </div>
        </section>

        {(recipe.prep_photo_url || recipe.final_plate_photo_url) ? (
          <section className="mb-6 grid gap-4 md:grid-cols-2">
            {recipe.prep_photo_url ? (
              <div className="print-card rounded-2xl border border-[#d8c8a7] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Prep Photo
                </p>
                <img
                  src={recipe.prep_photo_url}
                  alt="Recipe prep"
                  className="max-h-64 w-full rounded-xl object-cover"
                />
              </div>
            ) : null}

            {recipe.final_plate_photo_url ? (
              <div className="print-card rounded-2xl border border-[#d8c8a7] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Final Plate Photo
                </p>
                <img
                  src={recipe.final_plate_photo_url}
                  alt="Final plate"
                  className="max-h-64 w-full rounded-xl object-cover"
                />
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="print-card mb-6 overflow-hidden rounded-2xl border border-[#d8c8a7]">
          <div className="border-b border-[#d8c8a7] bg-[#f7f1e6] p-4">
            <h3 className="text-xl font-black">Ingredients</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#d8c8a7] text-left text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  <th className="px-4 py-3">Ingredient</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Cost/Unit</th>
                  <th className="px-4 py-3">Line Cost</th>
                  <th className="px-4 py-3">Prep Note</th>
                </tr>
              </thead>

              <tbody>
                {ingredients.length > 0 ? (
                  ingredients.map((ingredient) => {
                    const lineCost =
                      toNumber(ingredient.line_cost) > 0
                        ? toNumber(ingredient.line_cost)
                        : toNumber(ingredient.quantity) *
                          toNumber(ingredient.cost_per_unit);

                    return (
                      <tr key={ingredient.id} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-bold">
                          {ingredient.raw_ingredient_name ||
                            ingredient.ingredient_name ||
                            "Unnamed Ingredient"}
                        </td>
                        <td className="px-4 py-3">
                          {toNumber(ingredient.quantity)}
                        </td>
                        <td className="px-4 py-3">{ingredient.unit || "unit"}</td>
                        <td className="px-4 py-3">
                          {formatCurrency(ingredient.cost_per_unit)}
                        </td>
                        <td className="px-4 py-3 font-bold">
                          {formatCurrency(lineCost)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {ingredient.prep_note || "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-4 text-sm font-semibold" colSpan={6}>
                      No ingredients added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-card mb-6 rounded-2xl border border-[#d8c8a7] p-4">
          <h3 className="text-xl font-black">Instructions</h3>

          <div className="mt-4 min-h-32 whitespace-pre-wrap rounded-2xl border border-dashed border-[#d8c8a7] p-4 text-sm leading-7 text-slate-700">
            {recipe.instructions?.trim()
              ? recipe.instructions
              : "Add prep method, station notes, plating notes, and kitchen instructions here."}
          </div>
        </section>

        <section className="print-card rounded-2xl border border-[#d8c8a7] p-4">
          <h3 className="text-xl font-black">Kitchen Sign-Off</h3>

          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Chef
              </p>
              <div className="mt-8 border-b border-slate-400" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Station
              </p>
              <div className="mt-8 border-b border-slate-400" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Date
              </p>
              <div className="mt-8 border-b border-slate-400" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}