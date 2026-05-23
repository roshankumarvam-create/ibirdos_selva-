"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ExtractedIngredient = {
  rawIngredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  prepNote: string;
  sortOrder: number;
};

type RecipeImportResponse = {
  success?: boolean;
  error?: string;
  extractedRecipe?: {
    recipeName?: string;
    name?: string;
    category?: string;
    servings?: number;
    sellingPrice?: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    portionWeight?: number;
    portionUnit?: string;
    prepPhotoUrl?: string;
    finalPlatePhotoUrl?: string;
    instructions?: string;
    ingredients?: ExtractedIngredient[];
  };
  data?: {
    recipeName?: string;
    name?: string;
    category?: string;
    servings?: number;
    sellingPrice?: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    portionWeight?: number;
    portionUnit?: string;
    prepPhotoUrl?: string;
    finalPlatePhotoUrl?: string;
    instructions?: string;
    ingredients?: ExtractedIngredient[];
  };
};

const allowedExtensions = [".xlsx", ".xls", ".csv", ".pdf", ".jpg", ".jpeg", ".png", ".webp"];

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RecipeImportPage() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualNote, setManualNote] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fileStatus = useMemo(() => {
    if (!selectedFile) {
      return "No file selected";
    }

    return `${selectedFile.name} • ${formatFileSize(selectedFile.size)}`;
  }, [selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;

    setError("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = getFileExtension(file.name);

    if (!allowedExtensions.includes(extension)) {
      setSelectedFile(null);
      setError("Unsupported file type. Upload Excel, CSV, PDF, JPG, PNG, or WEBP.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a recipe file first.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("manualNote", manualNote);

      const response = await fetch("/api/recipes/import", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as RecipeImportResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.error ?? "Recipe import failed.");
      }

      const extractedRecipe = data.extractedRecipe ?? data.data;

      if (!extractedRecipe) {
        throw new Error("No recipe data was extracted.");
      }

      sessionStorage.setItem(
        "ibirdos_recipe_import_review",
        JSON.stringify({
          sourceFileName: selectedFile.name,
          sourceFileType: getFileExtension(selectedFile.name),
          recipeName: extractedRecipe.recipeName ?? extractedRecipe.name ?? "",
          category: extractedRecipe.category ?? "Other",
          servings: extractedRecipe.servings ?? 1,
          sellingPrice: extractedRecipe.sellingPrice ?? 0,
          prepTimeMinutes: extractedRecipe.prepTimeMinutes ?? 0,
          cookTimeMinutes: extractedRecipe.cookTimeMinutes ?? 0,
          portionWeight: extractedRecipe.portionWeight ?? 0,
          portionUnit: extractedRecipe.portionUnit ?? "oz",
          prepPhotoUrl: extractedRecipe.prepPhotoUrl ?? "",
          finalPlatePhotoUrl: extractedRecipe.finalPlatePhotoUrl ?? "",
          instructions: extractedRecipe.instructions ?? "",
          ingredients: extractedRecipe.ingredients ?? [],
        }),
      );

      router.push("/recipes/import-review");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Recipe import failed.";

      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f1e6] px-4 py-6 text-[#051f14]">
      <div className="mx-auto max-w-5xl">
        <section className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#9a6b24]">
              Recipe Import
            </p>

            <h1 className="mt-2 text-3xl font-black md:text-5xl">
              Upload Recipe File
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Upload Excel, CSV, PDF, or image recipes. iBirdOS will extract the recipe, then you can review before saving.
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
              href="/recipes/new"
              className="rounded-full bg-[#052e1c] px-5 py-3 text-sm font-bold text-white"
            >
              Manual Create Recipe
            </Link>
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-5">
          <section className="rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm">
            <div className="rounded-[2rem] border-2 border-dashed border-[#d8c8a7] bg-[#fffdf8] p-6 text-center">
              <p className="text-xl font-black text-[#052e1c]">
                Choose recipe file
              </p>

              <p className="mt-2 text-sm text-slate-600">
                Supported: Excel, CSV, PDF, JPG, PNG, WEBP
              </p>

              <label className="mt-5 inline-flex cursor-pointer rounded-full bg-[#052e1c] px-6 py-4 text-sm font-black text-white">
                Select File
                <input
                  suppressHydrationWarning
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              <p className="mt-4 text-sm font-semibold text-slate-700">
                {fileStatus}
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Optional Import Notes
            </label>

            <textarea
              suppressHydrationWarning
              value={manualNote}
              onChange={(event) => setManualNote(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#052e1c]"
              placeholder="Example: This recipe serves 25 people. Use selling price $9.50 if missing."
            />
          </section>

          <section className="rounded-[2rem] border border-[#d8c8a7] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Import workflow</h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-black">1. Upload</p>
                <p className="mt-2 text-sm text-slate-600">
                  Upload Excel, CSV, PDF, or photo.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-black">2. Review</p>
                <p className="mt-2 text-sm text-slate-600">
                  Fix ingredients, quantity, unit, and cost.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="font-black">3. Save</p>
                <p className="mt-2 text-sm text-slate-600">
                  Save clean recipe without duplicate ingredients.
                </p>
              </div>
            </div>
          </section>

          <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[2rem] border border-[#d8c8a7] bg-white/95 p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-slate-600">
              This step extracts only. You will review before saving.
            </p>

            <button
              type="submit"
              disabled={isUploading}
              className="rounded-full bg-[#052e1c] px-6 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isUploading ? "Extracting..." : "Extract Recipe"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}