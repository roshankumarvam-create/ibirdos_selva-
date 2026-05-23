"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

type ReviewIngredient = {
  id: string;
  rawIngredientName: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  lineCost: string;
  prepNote: string;
  sortOrder: number;
};

type ImportReviewForm = {
  sourceFileName: string;
  sourceFileType: string;
  recipeName: string;
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
  ingredients: ReviewIngredient[];
};

type StoredIngredient = {
  id?: string;
  rawIngredientName?: string;
  name?: string;
  quantity?: number | string;
  unit?: string;
  costPerUnit?: number | string;
  lineCost?: number | string;
  prepNote?: string;
  sortOrder?: number | string;
};

type StoredImportReview = {
  sourceFileName?: string;
  sourceFileType?: string;
  recipeName?: string;
  name?: string;
  category?: string;
  servings?: number | string;
  sellingPrice?: number | string;
  prepTimeMinutes?: number | string;
  cookTimeMinutes?: number | string;
  portionWeight?: number | string;
  portionUnit?: string;
  prepPhotoUrl?: string;
  finalPlatePhotoUrl?: string;
  instructions?: string;
  ingredients?: StoredIngredient[];
};

type SaveReviewResponse = {
  success?: boolean;
  error?: string;
  recipe?: {
    id?: string;
  };
  data?: {
    id?: string;
  };
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
  "unit",
];

function createEmptyIngredient(sortOrder: number): ReviewIngredient {
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

function toText(value: string | number | null | undefined, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

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

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function normalizeStoredData(data: StoredImportReview): ImportReviewForm {
  const ingredients =
    data.ingredients && data.ingredients.length > 0
      ? data.ingredients.map((ingredient, index) => {
          const quantity = toText(ingredient.quantity, "0");
          const costPerUnit = toText(ingredient.costPerUnit, "0");
          const lineCost =
            toNumber(ingredient.lineCost) > 0
              ? toText(ingredient.lineCost, "0")
              : (toNumber(quantity) * toNumber(costPerUnit)).toFixed(2);

          return {
            id: ingredient.id ?? `ingredient-${index + 1}`,
            rawIngredientName: toText(
              ingredient.rawIngredientName ?? ingredient.name,
              "",
            ),
            quantity,
            unit: toText(ingredient.unit, "lb"),
            costPerUnit,
            lineCost,
            prepNote: toText(ingredient.prepNote, ""),
            sortOrder: toNumber(ingredient.sortOrder) || index + 1,
          };
        })
      : [createEmptyIngredient(1)];

  return {
    sourceFileName: toText(data.sourceFileName, ""),
    sourceFileType: toText(data.sourceFileType, ""),
    recipeName: toText(data.recipeName ?? data.name, ""),
    category: toText(data.category, "Other"),
    servings: toText(data.servings, "1"),
    sellingPrice: toText(data.sellingPrice, "0"),
    prepTimeMinutes: toText(data.prepTimeMinutes, "0"),
    cookTimeMinutes: toText(data.cookTimeMinutes, "0"),
    portionWeight: toText(data.portionWeight, "0"),
    portionUnit: toText(data.portionUnit, "oz"),
    prepPhotoUrl: toText(data.prepPhotoUrl, ""),
    finalPlatePhotoUrl: toText(data.finalPlatePhotoUrl, ""),
    instructions: toText(data.instructions, ""),
    ingredients,
  };
}

function getSavedRecipeId(response: SaveReviewResponse): string | null {
  return response.recipe?.id ?? response.data?.id ?? null;
}

export default function RecipeImportReviewPage() {
  const router = useRouter();

  const [form, setForm] = useState<ImportReviewForm | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const totals = useMemo(() => {
    const ingredients = form?.ingredients ?? [];

    const totalFoodCost = ingredients.reduce((sum, ingredient) => {
      return sum + toNumber(ingredient.quantity) * toNumber(ingredient.costPerUnit);
    }, 0);

    const servings = Math.max(toNumber(form?.servings), 1);
    const sellingPrice = toNumber(form?.sellingPrice);
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
  }, [form]);

  useEffect(() => {
    try {
      const storedValue = sessionStorage.getItem("ibirdos_recipe_import_review");

      if (!storedValue) {
        setError("No imported recipe found. Please upload a recipe file again.");
        setIsLoading(false);
        return;
      }

      const parsedData = JSON.parse(storedValue) as StoredImportReview;
      setForm(normalizeStoredData(parsedData));
    } catch {
      setError("Imported recipe data could not be read. Please upload again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  function updateFormField(
    field: keyof ImportReviewForm,
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ): void {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      return {
        ...currentForm,
        [field]: event.target.value,
      };
    });
  }

  function updateIngredientField(
    ingredientId: string,
    field: keyof ReviewIngredient,
    value: string,
  ): void {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      const updatedIngredients = currentForm.ingredients.map((ingredient) => {
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
        ...currentForm,
        ingredients: updatedIngredients,
      };
    });
  }

  function addIngredient(): void {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      return {
        ...currentForm,
        ingredients: [
          ...currentForm.ingredients,
          createEmptyIngredient(currentForm.ingredients.length + 1),
        ],
      };
    });
  }

  function removeIngredient(ingredientId: string): void {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      const nextIngredients = currentForm.ingredients
        .filter((ingredient) => ingredient.id !== ingredientId)
        .map((ingredient, index) => ({
          ...ingredient,
          sortOrder: index + 1,
        }));

      return {
        ...currentForm,
        ingredients:
          nextIngredients.length > 0 ? nextIngredients : [createEmptyIngredient(1)],
      };
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!form) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("");

      const recipeName = form.recipeName.trim();

      if (!recipeName) {
        throw new Error("Recipe name is required.");
      }

      const cleanIngredients = form.ingredients
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

      if (cleanIngredients.length === 0) {
        throw new Error("Add at least one ingredient.");
      }

      const response = await fetch("/api/recipes/import-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeName,
          name: recipeName,
          category: form.category.trim() || "Other",
          servings: toNumber(form.servings),
          sellingPrice: toNumber(form.sellingPrice),
          prepTimeMinutes: toNumber(form.prepTimeMinutes),
          cookTimeMinutes: toNumber(form.cookTimeMinutes),
          portionWeight: toNumber(form.portionWeight),
          portionUnit: form.portionUnit.trim() || "oz",
          prepPhotoUrl: form.prepPhotoUrl.trim(),
          finalPlatePhotoUrl: form.finalPlatePhotoUrl.trim(),
          instructions: form.instructions.trim(),
          sourceType: "import",
          ingredients: cleanIngredients,
        }),
      });

      const data = (await response.json()) as SaveReviewResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Recipe could not be saved.");
      }

      sessionStorage.removeItem("ibirdos_recipe_import_review");

      const savedRecipeId = getSavedRecipeId(data);

      setMessage("Recipe saved successfully.");

      if (savedRecipeId) {
        router.push(`/recipes/${savedRecipeId}`);
        return;
      }

      router.push("/recipes");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Recipe could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm">
          <p className="text-sm font-bold">Loading import review...</p>
        </div>
      </main>
    );
  }

  if (!form) {
    return (
      <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-red-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-red-700">
            {error || "No imported recipe found."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/recipes/import"
              className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
            >
              Upload Recipe Again
            </Link>

            <Link
              href="/recipes"
              className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
            >
              Back to Recipes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
              Recipe Import Review
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Review Recipe Before Saving
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Fix recipe details, remove extra ingredient lines, and save a clean
              recipe.
            </p>

            {form.sourceFileName ? (
              <p className="mt-2 text-xs font-bold text-slate-500">
                Source file: {form.sourceFileName}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/recipes/import"
              className="rounded-full border border-[#052e1c] px-5 py-3 text-sm font-bold text-[#052e1c]"
            >
              Back to Import
            </Link>

            <Link
              href="/recipes/new"
              className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
            >
              Manual Create Recipe
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

        <form onSubmit={handleSave} className="grid gap-5">
          <section className="grid gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-5 shadow-sm md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Recipe Name
              </label>
              <input
                suppressHydrationWarning
                value={form.recipeName}
                onChange={(event) => updateFormField("recipeName", event)}
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
                value={form.category}
                onChange={(event) => updateFormField("category", event)}
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
                value={form.servings}
                onChange={(event) => updateFormField("servings", event)}
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
                value={form.sellingPrice}
                onChange={(event) => updateFormField("sellingPrice", event)}
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
                value={form.prepTimeMinutes}
                onChange={(event) => updateFormField("prepTimeMinutes", event)}
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
                value={form.cookTimeMinutes}
                onChange={(event) => updateFormField("cookTimeMinutes", event)}
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
                value={form.portionWeight}
                onChange={(event) => updateFormField("portionWeight", event)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Portion Unit
              </label>
              <select
                suppressHydrationWarning
                value={form.portionUnit}
                onChange={(event) => updateFormField("portionUnit", event)}
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
                value={form.prepPhotoUrl}
                onChange={(event) => updateFormField("prepPhotoUrl", event)}
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
                value={form.finalPlatePhotoUrl}
                onChange={(event) => updateFormField("finalPlatePhotoUrl", event)}
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
                value={form.instructions}
                onChange={(event) => updateFormField("instructions", event)}
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
                <h2 className="text-2xl font-black">Review Ingredients</h2>
                <p className="text-sm text-slate-600">
                  Remove incorrect lines and fix quantity, unit, cost, and prep
                  notes.
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
              {form.ingredients.map((ingredient, index) => (
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
                      min="0"
                      step="0.0001"
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
                      min="0"
                      step="0.0001"
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
              Save will create or update the recipe and insert clean ingredient
              lines.
            </p>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-[#052e1c] px-6 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Reviewed Recipe"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}