"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type RecipeIngredientForm = {
  id: string;
  ingredientId: string | null;
  rawIngredientName: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  lineCost: string;
  prepNote: string;
  sortOrder: number;
};

type RecipeForm = {
  id: string;
  name: string;
  category: string;
  servings: string;
  sellingPrice: string;
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  portionWeight: string;
  portionUnit: string;
  prepPhotoUrl: string;
  finalPlatePhotoUrl: string;
  instructions: string;
  ingredients: RecipeIngredientForm[];
};

type ApiIngredientRow = {
  id?: string | null;
  ingredient_id?: string | null;
  matched_ingredient_id?: string | null;
  raw_ingredient_name?: string | null;
  ingredient_name?: string | null;
  name?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  cost_per_unit?: string | number | null;
  latest_cost?: string | number | null;
  line_cost?: string | number | null;
  prep_note?: string | null;
  sort_order?: string | number | null;
};

type ApiRecipeRow = {
  id?: string;
  name?: string | null;
  category?: string | null;
  servings?: string | number | null;
  selling_price?: string | number | null;
  sellingPrice?: string | number | null;
  prep_time_minutes?: string | number | null;
  cook_time_minutes?: string | number | null;
  portion_weight?: string | number | null;
  portion_unit?: string | null;
  prep_photo_url?: string | null;
  final_plate_photo_url?: string | null;
  instructions?: string | null;
  ingredients?: ApiIngredientRow[];
  recipe_ingredients?: ApiIngredientRow[];
};

type RecipeApiResponse = {
  success?: boolean;
  recipe?: ApiRecipeRow;
  data?: ApiRecipeRow;
  error?: string;
};

type SaveApiResponse = {
  success?: boolean;
  recipe?: ApiRecipeRow;
  data?: ApiRecipeRow;
  error?: string;
};

const emptyIngredient = (sortOrder: number): RecipeIngredientForm => ({
  id: `new-${Date.now()}-${sortOrder}`,
  ingredientId: null,
  rawIngredientName: "",
  quantity: "0",
  unit: "lb",
  costPerUnit: "0",
  lineCost: "0",
  prepNote: "",
  sortOrder,
});

function toText(value: string | number | null | undefined, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function normalizeRecipe(recipe: ApiRecipeRow): RecipeForm {
  const ingredientRows = recipe.ingredients ?? recipe.recipe_ingredients ?? [];

  const ingredients =
    ingredientRows.length > 0
      ? ingredientRows.map((ingredient, index) => {
          const quantity = toText(ingredient.quantity, "0");
          const costPerUnit = toText(
            ingredient.cost_per_unit ?? ingredient.latest_cost,
            "0",
          );
          const calculatedLineCost = toNumber(quantity) * toNumber(costPerUnit);

          return {
            id: toText(ingredient.id, `existing-${index}`),
            ingredientId:
              ingredient.ingredient_id ??
              ingredient.matched_ingredient_id ??
              null,
            rawIngredientName: toText(
              ingredient.raw_ingredient_name ??
                ingredient.ingredient_name ??
                ingredient.name,
            ),
            quantity,
            unit: toText(ingredient.unit, "lb"),
            costPerUnit,
            lineCost: toText(ingredient.line_cost, calculatedLineCost.toFixed(2)),
            prepNote: toText(ingredient.prep_note),
            sortOrder: toNumber(ingredient.sort_order ?? index + 1),
          };
        })
      : [emptyIngredient(1)];

  return {
    id: toText(recipe.id),
    name: toText(recipe.name),
    category: toText(recipe.category, "Other"),
    servings: toText(recipe.servings, "1"),
    sellingPrice: toText(recipe.selling_price ?? recipe.sellingPrice, "0"),
    prepTimeMinutes: toText(recipe.prep_time_minutes, "0"),
    cookTimeMinutes: toText(recipe.cook_time_minutes, "0"),
    portionWeight: toText(recipe.portion_weight, "0"),
    portionUnit: toText(recipe.portion_unit, "oz"),
    prepPhotoUrl: toText(recipe.prep_photo_url),
    finalPlatePhotoUrl: toText(recipe.final_plate_photo_url),
    instructions: toText(recipe.instructions),
    ingredients,
  };
}

function getRecipeFromResponse(response: RecipeApiResponse): ApiRecipeRow | null {
  return response.recipe ?? response.data ?? null;
}

export default function RecipeDetailPage() {
  const params = useParams<{ recipeId: string }>();
  const router = useRouter();

  const recipeId = params.recipeId;

  const [recipe, setRecipe] = useState<RecipeForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totals = useMemo(() => {
    const ingredients = recipe?.ingredients ?? [];

    const totalFoodCost = ingredients.reduce((sum, ingredient) => {
      return sum + toNumber(ingredient.quantity) * toNumber(ingredient.costPerUnit);
    }, 0);

    const servings = Math.max(toNumber(recipe?.servings), 1);
    const sellingPrice = toNumber(recipe?.sellingPrice);
    const costPerServing = totalFoodCost / servings;
    const profitPerServing = sellingPrice - costPerServing;
    const marginPercent =
      sellingPrice > 0 ? (profitPerServing / sellingPrice) * 100 : 0;

    return {
      totalFoodCost,
      costPerServing,
      profitPerServing,
      marginPercent,
    };
  }, [recipe]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecipe() {
      try {
        setIsLoading(true);
        setError("");
        setMessage("");

        const response = await fetch(`/api/recipes/${recipeId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as RecipeApiResponse;

        if (!response.ok || data.success === false) {
          throw new Error(data.error ?? "Recipe could not be loaded.");
        }

        const apiRecipe = getRecipeFromResponse(data);

        if (!apiRecipe) {
          throw new Error("Recipe not found.");
        }

        if (isMounted) {
          setRecipe(normalizeRecipe(apiRecipe));
        }
      } catch (loadError: unknown) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
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

  function updateRecipeField(field: keyof RecipeForm, value: string) {
    setRecipe((currentRecipe) => {
      if (!currentRecipe) {
        return currentRecipe;
      }

      return {
        ...currentRecipe,
        [field]: value,
      };
    });
  }

  function updateIngredientField(
    ingredientId: string,
    field: keyof RecipeIngredientForm,
    value: string,
  ) {
    setRecipe((currentRecipe) => {
      if (!currentRecipe) {
        return currentRecipe;
      }

      const updatedIngredients = currentRecipe.ingredients.map((ingredient) => {
        if (ingredient.id !== ingredientId) {
          return ingredient;
        }

        const updatedIngredient = {
          ...ingredient,
          [field]: value,
        };

        const lineCost =
          toNumber(updatedIngredient.quantity) *
          toNumber(updatedIngredient.costPerUnit);

        return {
          ...updatedIngredient,
          lineCost: lineCost.toFixed(2),
        };
      });

      return {
        ...currentRecipe,
        ingredients: updatedIngredients,
      };
    });
  }

  function addIngredient() {
    setRecipe((currentRecipe) => {
      if (!currentRecipe) {
        return currentRecipe;
      }

      return {
        ...currentRecipe,
        ingredients: [
          ...currentRecipe.ingredients,
          emptyIngredient(currentRecipe.ingredients.length + 1),
        ],
      };
    });
  }

  function removeIngredient(ingredientId: string) {
    setRecipe((currentRecipe) => {
      if (!currentRecipe) {
        return currentRecipe;
      }

      const nextIngredients = currentRecipe.ingredients
        .filter((ingredient) => ingredient.id !== ingredientId)
        .map((ingredient, index) => ({
          ...ingredient,
          sortOrder: index + 1,
        }));

      return {
        ...currentRecipe,
        ingredients:
          nextIngredients.length > 0 ? nextIngredients : [emptyIngredient(1)],
      };
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!recipe) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const cleanIngredients = recipe.ingredients
        .filter((ingredient) => ingredient.rawIngredientName.trim().length > 0)
        .map((ingredient, index) => ({
          id: ingredient.id.startsWith("new-") ? null : ingredient.id,
          ingredientId: ingredient.ingredientId,
          rawIngredientName: ingredient.rawIngredientName.trim(),
          quantity: toNumber(ingredient.quantity),
          unit: ingredient.unit.trim() || "lb",
          costPerUnit: toNumber(ingredient.costPerUnit),
          lineCost: toNumber(ingredient.quantity) * toNumber(ingredient.costPerUnit),
          prepNote: ingredient.prepNote.trim(),
          sortOrder: index + 1,
        }));

      if (!recipe.name.trim()) {
        throw new Error("Recipe name is required.");
      }

      if (cleanIngredients.length === 0) {
        throw new Error("Add at least one ingredient.");
      }

      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: recipe.name.trim(),
          category: recipe.category.trim() || "Other",
          servings: toNumber(recipe.servings),
          sellingPrice: toNumber(recipe.sellingPrice),
          prepTimeMinutes: toNumber(recipe.prepTimeMinutes),
          cookTimeMinutes: toNumber(recipe.cookTimeMinutes),
          portionWeight: toNumber(recipe.portionWeight),
          portionUnit: recipe.portionUnit.trim() || "oz",
          prepPhotoUrl: recipe.prepPhotoUrl.trim(),
          finalPlatePhotoUrl: recipe.finalPlatePhotoUrl.trim(),
          instructions: recipe.instructions.trim(),
          ingredients: cleanIngredients,
        }),
      });

      const data = (await response.json()) as SaveApiResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Recipe could not be saved.");
      }

      const updatedRecipe = getRecipeFromResponse(data);

      if (updatedRecipe) {
        setRecipe(normalizeRecipe(updatedRecipe));
      }

      setMessage("Recipe saved and recalculated.");
      router.refresh();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Recipe could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleInputChange(
    field: keyof RecipeForm,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    updateRecipeField(field, event.target.value);
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold">Loading recipe...</p>
        </div>
      </main>
    );
  }

  if (error && !recipe) {
    return (
      <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <Link
            href="/recipes"
            className="mt-4 inline-flex rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
          >
            Back to recipes
          </Link>
        </div>
      </main>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
              Recipe Library
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Edit Recipe
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Review imported recipes, remove extra ingredients, update prep
              details, and recalculate food cost.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/recipes"
              className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
            >
              Back
            </Link>
            <Link
              href="/recipes/new"
              className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
            >
              Manual Create Recipe
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSave} className="grid gap-5">
          <section className="grid gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Recipe Name
              </label>
              <input
                value={recipe.name}
                onChange={(event) => handleInputChange("name", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#052e1c]"
                placeholder="Example: Grilled Chicken Bowl"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Category
              </label>
              <input
                value={recipe.category}
                onChange={(event) => handleInputChange("category", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="Entree"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Servings
              </label>
              <input
                type="number"
                min="1"
                value={recipe.servings}
                onChange={(event) => handleInputChange("servings", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Selling Price Per Serving
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={recipe.sellingPrice}
                onChange={(event) => handleInputChange("sellingPrice", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Prep Time Minutes
              </label>
              <input
                type="number"
                min="0"
                value={recipe.prepTimeMinutes}
                onChange={(event) => handleInputChange("prepTimeMinutes", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Cook Time Minutes
              </label>
              <input
                type="number"
                min="0"
                value={recipe.cookTimeMinutes}
                onChange={(event) => handleInputChange("cookTimeMinutes", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Portion Weight
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={recipe.portionWeight}
                onChange={(event) => handleInputChange("portionWeight", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Portion Unit
              </label>
              <select
                value={recipe.portionUnit}
                onChange={(event) => handleInputChange("portionUnit", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              >
                <option value="oz">oz</option>
                <option value="lb">lb</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="piece">piece</option>
                <option value="portion">portion</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Prep Photo URL
              </label>
              <input
                value={recipe.prepPhotoUrl}
                onChange={(event) => handleInputChange("prepPhotoUrl", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Final Plate Photo URL
              </label>
              <input
                value={recipe.finalPlatePhotoUrl}
                onChange={(event) => handleInputChange("finalPlatePhotoUrl", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Instructions
              </label>
              <textarea
                value={recipe.instructions}
                onChange={(event) => handleInputChange("instructions", event)}
                rows={5}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="Prep steps, cooking method, plating notes..."
              />
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
                  Ingredients
                </p>
                <h2 className="text-2xl font-black">Recipe Ingredients</h2>
                <p className="text-sm text-slate-600">
                  Remove extra imported lines and fix quantity, unit, cost, or
                  prep notes.
                </p>
              </div>

              <button
                type="button"
                onClick={addIngredient}
                className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
              >
                Add Ingredient
              </button>
            </div>

            <div className="grid gap-4">
              {recipe.ingredients.map((ingredient, index) => (
                <div
                  key={ingredient.id}
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-[#fffdf8] p-4 md:grid-cols-12"
                >
                  <div className="md:col-span-3">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Ingredient
                    </label>
                    <input
                      value={ingredient.rawIngredientName}
                      onChange={(event) =>
                        updateIngredientField(
                          ingredient.id,
                          "rawIngredientName",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#052e1c]"
                      placeholder={`Ingredient ${index + 1}`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={ingredient.quantity}
                      onChange={(event) =>
                        updateIngredientField(
                          ingredient.id,
                          "quantity",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#052e1c]"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Unit
                    </label>
                    <input
                      value={ingredient.unit}
                      onChange={(event) =>
                        updateIngredientField(
                          ingredient.id,
                          "unit",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#052e1c]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Cost/Unit
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={ingredient.costPerUnit}
                      onChange={(event) =>
                        updateIngredientField(
                          ingredient.id,
                          "costPerUnit",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#052e1c]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Line Cost
                    </label>
                    <input
                      value={formatMoney(toNumber(ingredient.lineCost))}
                      readOnly
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Action
                    </label>
                    <button
                      type="button"
                      onClick={() => removeIngredient(ingredient.id)}
                      className="mt-2 w-full rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="md:col-span-12">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Prep Note
                    </label>
                    <input
                      value={ingredient.prepNote}
                      onChange={(event) =>
                        updateIngredientField(
                          ingredient.id,
                          "prepNote",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#052e1c]"
                      placeholder="Example: diced small, roasted, drained, thawed..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm md:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Total Food Cost
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatMoney(totals.totalFoodCost)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Cost Per Serving
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatMoney(totals.costPerServing)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Profit Per Serving
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatMoney(totals.profitPerServing)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Margin
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatPercent(totals.marginPercent)}
              </p>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[2rem] border border-[#d8c8a7] bg-white/95 p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-600">
              Save will update the recipe and recalculate food cost.
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#052e1c] px-6 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Recipe"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}