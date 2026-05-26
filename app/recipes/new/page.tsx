"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type RecipeIngredientForm = {
  id: string;
  rawIngredientName: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  lineCost: string;
  prepNote: string;
  sortOrder: number;
};

type RecipeForm = {
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

type SaveRecipeResponse = {
  success?: boolean;
  recipe?: {
    id?: string;
  };
  data?: {
    id?: string;
  };
  error?: string;
};

const categoryOptions = [
  "Appetizer",
  "Entree",
  "Side",
  "Dessert",
  "Sauce",
  "Beverage",
  "Other",
];

const unitOptions = [
  "lb",
  "oz",
  "g",
  "kg",
  "each",
  "piece",
  "cup",
  "tbsp",
  "tsp",
  "gal",
  "qt",
  "pt",
  "ml",
  "l",
  "portion",
];

function createEmptyIngredient(sortOrder: number): RecipeIngredientForm {
  return {
    id: `ingredient-${Date.now()}-${sortOrder}`,
    rawIngredientName: "",
    quantity: "0",
    unit: "lb",
    costPerUnit: "0",
    lineCost: "0",
    prepNote: "",
    sortOrder,
  };
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(/[$,%\s,]/g, ""));

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function getSavedRecipeId(data: SaveRecipeResponse): string | null {
  return data.recipe?.id ?? data.data?.id ?? null;
}

export default function NewRecipePage() {
  const router = useRouter();

  const [recipe, setRecipe] = useState<RecipeForm>({
    name: "",
    category: "Entree",
    servings: "1",
    sellingPrice: "0",
    prepTimeMinutes: "0",
    cookTimeMinutes: "0",
    portionWeight: "0",
    portionUnit: "oz",
    prepPhotoUrl: "",
    finalPlatePhotoUrl: "",
    instructions: "",
    ingredients: [createEmptyIngredient(1)],
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const totals = useMemo(() => {
    const totalFoodCost = recipe.ingredients.reduce((sum, ingredient) => {
      return sum + toNumber(ingredient.quantity) * toNumber(ingredient.costPerUnit);
    }, 0);

    const servings = Math.max(toNumber(recipe.servings), 1);
    const sellingPrice = toNumber(recipe.sellingPrice);
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

  function updateRecipeField(
    field: keyof RecipeForm,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    setRecipe((currentRecipe) => ({
      ...currentRecipe,
      [field]: event.target.value,
    }));
  }

  function updateIngredientField(
    ingredientId: string,
    field: keyof RecipeIngredientForm,
    value: string,
  ): void {
    setRecipe((currentRecipe) => {
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

  function addIngredient(): void {
    setRecipe((currentRecipe) => ({
      ...currentRecipe,
      ingredients: [
        ...currentRecipe.ingredients,
        createEmptyIngredient(currentRecipe.ingredients.length + 1),
      ],
    }));
  }

  function removeIngredient(ingredientId: string): void {
    setRecipe((currentRecipe) => {
      const remainingIngredients = currentRecipe.ingredients
        .filter((ingredient) => ingredient.id !== ingredientId)
        .map((ingredient, index) => ({
          ...ingredient,
          sortOrder: index + 1,
        }));

      return {
        ...currentRecipe,
        ingredients:
          remainingIngredients.length > 0
            ? remainingIngredients
            : [createEmptyIngredient(1)],
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const cleanName = recipe.name.trim();
      const cleanIngredients = recipe.ingredients
        .filter((ingredient) => ingredient.rawIngredientName.trim().length > 0)
        .map((ingredient, index) => ({
          rawIngredientName: ingredient.rawIngredientName.trim(),
          quantity: toNumber(ingredient.quantity),
          unit: ingredient.unit.trim() || "lb",
          costPerUnit: toNumber(ingredient.costPerUnit),
          lineCost: toNumber(ingredient.quantity) * toNumber(ingredient.costPerUnit),
          prepNote: ingredient.prepNote.trim(),
          sortOrder: index + 1,
        }));

      if (!cleanName) {
        throw new Error("Recipe name is required.");
      }

      if (cleanIngredients.length === 0) {
        throw new Error("Add at least one ingredient.");
      }

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          recipeName: cleanName,
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
          sourceType: "manual",
          ingredients: cleanIngredients,
        }),
      });

      const data = (await response.json()) as SaveRecipeResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Recipe could not be saved.");
      }

      const savedRecipeId = getSavedRecipeId(data);

      setMessage("Recipe saved successfully.");

      if (savedRecipeId) {
        router.push(`/recipes/${savedRecipeId}`);
        return;
      }

      router.push("/recipes");
    } catch (caughtError) {
      const messageText =
        caughtError instanceof Error
          ? caughtError.message
          : "Recipe could not be saved.";

      setError(messageText);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
              Recipe Library
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Create Recipe Manually
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Add recipe details, prep/cook time, portion weight, photos, and ingredient costs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/recipes"
              className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
            >
              Back to Recipes
            </Link>

            <Link
              href="/recipes/import"
              className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
            >
              Upload Recipe File
            </Link>
          </div>
        </section>

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

        <form onSubmit={handleSubmit} className="grid gap-5">
          <section className="grid gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Recipe Name
              </label>
              <input
                suppressHydrationWarning
                value={recipe.name}
                onChange={(event) => updateRecipeField("name", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-[#052e1c]"
                placeholder="Example: Grilled Chicken Bowl"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Category
              </label>
              <select
                suppressHydrationWarning
                value={recipe.category}
                onChange={(event) => updateRecipeField("category", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Servings
              </label>
              <input
                suppressHydrationWarning
                type="number"
                min="1"
                value={recipe.servings}
                onChange={(event) => updateRecipeField("servings", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Selling Price Per Serving
              </label>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                step="0.01"
                value={recipe.sellingPrice}
                onChange={(event) => updateRecipeField("sellingPrice", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Prep Time Minutes
              </label>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                value={recipe.prepTimeMinutes}
                onChange={(event) => updateRecipeField("prepTimeMinutes", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Cook Time Minutes
              </label>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                value={recipe.cookTimeMinutes}
                onChange={(event) => updateRecipeField("cookTimeMinutes", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Portion Weight
              </label>
              <input
                suppressHydrationWarning
                type="number"
                min="0"
                step="0.01"
                value={recipe.portionWeight}
                onChange={(event) => updateRecipeField("portionWeight", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Portion Unit
              </label>
              <select
                suppressHydrationWarning
                value={recipe.portionUnit}
                onChange={(event) => updateRecipeField("portionUnit", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Prep Photo URL
              </label>
              <input
                suppressHydrationWarning
                value={recipe.prepPhotoUrl}
                onChange={(event) => updateRecipeField("prepPhotoUrl", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Final Plate Photo URL
              </label>
              <input
                suppressHydrationWarning
                value={recipe.finalPlatePhotoUrl}
                onChange={(event) => updateRecipeField("finalPlatePhotoUrl", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Instructions
              </label>
              <textarea
                suppressHydrationWarning
                value={recipe.instructions}
                onChange={(event) => updateRecipeField("instructions", event)}
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
                  Add ingredients manually. Cost updates will later connect to provider invoices.
                </p>
              </div>

              <button
                type="button"
                suppressHydrationWarning
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
                      suppressHydrationWarning
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
                      suppressHydrationWarning
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
                    <select
                      suppressHydrationWarning
                      value={ingredient.unit}
                      onChange={(event) =>
                        updateIngredientField(
                          ingredient.id,
                          "unit",
                          event.target.value,
                        )
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#052e1c]"
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Cost/Unit
                    </label>
                    <input
                      suppressHydrationWarning
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
                      suppressHydrationWarning
                      value={formatCurrency(toNumber(ingredient.lineCost))}
                      readOnly
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-3 py-3 text-sm font-bold text-slate-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      Action
                    </label>
                    <button
                    suppressHydrationWarning
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
                      suppressHydrationWarning
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
                {formatCurrency(totals.totalFoodCost)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Cost Per Serving
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatCurrency(totals.costPerServing)}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Profit Per Serving
              </p>
              <p className="mt-2 text-3xl font-black">
                {formatCurrency(totals.profitPerServing)}
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
              Save will create the recipe and calculate food cost.
            </p>

            <button
              suppressHydrationWarning
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