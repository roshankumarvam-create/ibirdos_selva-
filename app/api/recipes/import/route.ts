import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSessionFromRequest } from "@/app/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = {
  user_id?: string;
  email?: string;
  role?: string;
  company_id?: string;
};

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type ExtractedIngredient = {
  id: string;
  rawIngredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  prepNote: string;
  sortOrder: number;
};

type ExtractedRecipe = {
  recipeName: string;
  name: string;
  category: string;
  servings: number;
  sellingPrice: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  portionWeight: number;
  portionUnit: string;
  prepPhotoUrl: string;
  finalPlatePhotoUrl: string;
  instructions: string;
  ingredients: ExtractedIngredient[];
};

type ImportResponse =
  | {
      success: true;
      extractedRecipe: ExtractedRecipe;
      data: ExtractedRecipe;
      sourceFileName: string;
      sourceFileType: string;
    }
  | {
      success: false;
      error: string;
    };

type CellValue = string | number | boolean | Date | null | undefined;
type SheetRow = CellValue[];

const allowedExtensions = [
  ".xlsx",
  ".xls",
  ".csv",
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

const unitWords = [
  "lb",
  "lbs",
  "oz",
  "g",
  "kg",
  "each",
  "piece",
  "pieces",
  "cup",
  "cups",
  "tbsp",
  "tsp",
  "gal",
  "qt",
  "pt",
  "ml",
  "l",
  "portion",
  "portions",
  "unit",
];

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: "Recipe import API is working.",
  });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ImportResponse>> {
  try {
    await getCurrentUser(request);

    const formData = await request.formData();
    const fileValue = formData.get("file");
    const manualNoteValue = formData.get("manualNote");
    const manualNote =
      typeof manualNoteValue === "string" ? manualNoteValue.trim() : "";

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Recipe file is required." },
        { status: 400 },
      );
    }

    const fileName = fileValue.name;
    const extension = getFileExtension(fileName);

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          success: false,
          error: "Upload Excel, CSV, PDF, JPG, PNG, or WEBP.",
        },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await fileValue.arrayBuffer());

    let extractedRecipe: ExtractedRecipe;

    if (extension === ".xlsx" || extension === ".xls") {
      extractedRecipe = extractFromWorkbook(buffer, fileName, manualNote);
    } else if (extension === ".csv") {
      extractedRecipe = extractFromCsv(buffer.toString("utf-8"), fileName, manualNote);
    } else {
      extractedRecipe = extractFromPdfOrImagePlaceholder(
        fileName,
        extension,
        manualNote,
      );
    }

    return NextResponse.json({
      success: true,
      extractedRecipe,
      data: extractedRecipe,
      sourceFileName: fileName,
      sourceFileType: extension,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Recipe import failed.",
      },
      { status: getStatusCode(error) },
    );
  }
}

async function getCurrentUser(request: NextRequest): Promise<CurrentUser> {
  const session = (await getSessionFromRequest(request)) as SessionUser | null;

  if (
    !session ||
    typeof session.user_id !== "string" ||
    typeof session.email !== "string" ||
    typeof session.role !== "string" ||
    typeof session.company_id !== "string" ||
    session.company_id.trim().length === 0
  ) {
    throw new Error("Not authenticated");
  }

  return {
    id: session.user_id,
    email: session.email,
    role: session.role,
    company_id: session.company_id,
  };
}

function getStatusCode(error: unknown): number {
  if (error instanceof Error && error.message === "Not authenticated") {
    return 401;
  }

  return 500;
}

function extractFromWorkbook(
  buffer: Buffer,
  fileName: string,
  manualNote: string,
): ExtractedRecipe {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Excel file has no sheets.");
  }

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Excel sheet could not be read.");
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return extractRecipeFromRows(rows, fileName, manualNote);
}

function extractFromCsv(
  csvText: string,
  fileName: string,
  manualNote: string,
): ExtractedRecipe {
  const workbook = XLSX.read(csvText, {
    type: "string",
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("CSV file could not be read.");
  }

  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("CSV sheet could not be read.");
  }

  const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return extractRecipeFromRows(rows, fileName, manualNote);
}

function extractRecipeFromRows(
  rows: SheetRow[],
  fileName: string,
  manualNote: string,
): ExtractedRecipe {
  const cleanedRows = rows
    .map((row) => row.map((cell) => cellToString(cell)))
    .filter((row) => row.some((cell) => cell.length > 0));

  const recipeName = findRecipeName(cleanedRows) ?? cleanRecipeName(fileName);
  const servings = findNumberAfterLabels(cleanedRows, [
    "serving",
    "servings",
    "yield",
    "portion",
    "portions",
  ]);

  const sellingPrice = findNumberAfterLabels(cleanedRows, [
    "selling price",
    "price",
    "menu price",
  ]);

  const prepTimeMinutes = findNumberAfterLabels(cleanedRows, [
    "prep time",
    "prep minutes",
  ]);

  const cookTimeMinutes = findNumberAfterLabels(cleanedRows, [
    "cook time",
    "cook minutes",
  ]);

  const portionWeight = findNumberAfterLabels(cleanedRows, [
    "portion weight",
    "portion size",
  ]);

  const ingredients = extractIngredients(cleanedRows);
  const instructions = extractInstructions(cleanedRows);

  return {
    recipeName,
    name: recipeName,
    category: guessCategory(`${recipeName} ${fileName}`),
    servings: servings > 0 ? servings : 1,
    sellingPrice: sellingPrice > 0 ? sellingPrice : 0,
    prepTimeMinutes: prepTimeMinutes > 0 ? prepTimeMinutes : 0,
    cookTimeMinutes: cookTimeMinutes > 0 ? cookTimeMinutes : 0,
    portionWeight: portionWeight > 0 ? portionWeight : 0,
    portionUnit: guessPortionUnit(cleanedRows) ?? "oz",
    prepPhotoUrl: "",
    finalPlatePhotoUrl: "",
    instructions:
      instructions.length > 0
        ? instructions
        : manualNote ||
          "Recipe imported. Review ingredients, quantities, units, and instructions before saving.",
    ingredients:
      ingredients.length > 0
        ? ingredients
        : [
            {
              id: randomUUID(),
              rawIngredientName: "Review needed",
              quantity: 1,
              unit: "unit",
              costPerUnit: 0,
              prepNote: "Imported file needs manual ingredient review.",
              sortOrder: 1,
            },
          ],
  };
}

function extractFromPdfOrImagePlaceholder(
  fileName: string,
  extension: string,
  manualNote: string,
): ExtractedRecipe {
  const recipeName = cleanRecipeName(fileName);

  return {
    recipeName,
    name: recipeName,
    category: guessCategory(fileName),
    servings: 1,
    sellingPrice: 0,
    prepTimeMinutes: 0,
    cookTimeMinutes: 0,
    portionWeight: 0,
    portionUnit: "oz",
    prepPhotoUrl: "",
    finalPlatePhotoUrl: "",
    instructions:
      manualNote ||
      `${extension.toUpperCase()} received. Review manually now. AI PDF/image extraction can be connected next.`,
    ingredients: [
      {
        id: randomUUID(),
        rawIngredientName: "Review needed",
        quantity: 1,
        unit: "unit",
        costPerUnit: 0,
        prepNote: "PDF/image recipe needs manual review.",
        sortOrder: 1,
      },
    ],
  };
}

function extractIngredients(rows: string[][]): ExtractedIngredient[] {
  const headerIndex = findIngredientHeaderRowIndex(rows);

  if (headerIndex !== -1) {
    return extractIngredientsWithHeader(rows, headerIndex);
  }

  return extractIngredientsWithoutHeader(rows);
}

function extractIngredientsWithHeader(
  rows: string[][],
  headerIndex: number,
): ExtractedIngredient[] {
  const headerRow = rows[headerIndex].map(normalizeKey);

  const nameIndex = findFirstHeaderIndex(headerRow, [
    "ingredient",
    "ingredients",
    "ingredient name",
    "item",
    "item name",
    "product",
    "product name",
    "raw material",
    "description",
    "name",
  ]);

  const quantityIndex = findFirstHeaderIndex(headerRow, [
    "quantity",
    "qty",
    "amount",
    "recipe quantity",
    "yield quantity",
  ]);

  const unitIndex = findFirstHeaderIndex(headerRow, [
    "unit",
    "uom",
    "measure",
    "measurement",
    "unit of measure",
  ]);

  const costIndex = findFirstHeaderIndex(headerRow, [
    "cost",
    "unit cost",
    "price",
    "cost per unit",
  ]);

  const prepNoteIndex = findFirstHeaderIndex(headerRow, [
    "prep note",
    "note",
    "notes",
    "preparation",
    "prep",
  ]);

  if (nameIndex === -1) {
    return [];
  }

  const ingredients: ExtractedIngredient[] = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const name = row[nameIndex] ?? "";

    if (!isIngredientName(name, row)) {
      continue;
    }

    const quantity =
      quantityIndex >= 0 && row[quantityIndex]
        ? parseNumber(row[quantityIndex])
        : parseNumber(findQuantityInRow(row, nameIndex));

    const unit =
      unitIndex >= 0 && row[unitIndex]
        ? normalizeUnit(row[unitIndex])
        : normalizeUnit(findUnitInRow(row, nameIndex));

    const costPerUnit =
      costIndex >= 0 && row[costIndex] ? parseNumber(row[costIndex]) : 0;

    const prepNote =
      prepNoteIndex >= 0 && row[prepNoteIndex] ? row[prepNoteIndex] : "";

    ingredients.push({
      id: randomUUID(),
      rawIngredientName: cleanIngredientName(name),
      quantity: quantity > 0 ? quantity : 1,
      unit: unit || "unit",
      costPerUnit,
      prepNote,
      sortOrder: ingredients.length + 1,
    });
  }

  return ingredients;
}

function extractIngredientsWithoutHeader(rows: string[][]): ExtractedIngredient[] {
  const ingredients: ExtractedIngredient[] = [];

  for (const row of rows) {
    const joinedRow = normalizeKey(row.join(" "));

    if (
      joinedRow.includes("instruction") ||
      joinedRow.includes("method") ||
      joinedRow.includes("procedure") ||
      joinedRow.includes("direction")
    ) {
      break;
    }

    const nameIndex = row.findIndex((cell) => isIngredientName(cell, row));

    if (nameIndex === -1) {
      continue;
    }

    const possibleName = row[nameIndex] ?? "";
    const possibleQuantity = findQuantityInRow(row, nameIndex);
    const possibleUnit = findUnitInRow(row, nameIndex);

    ingredients.push({
      id: randomUUID(),
      rawIngredientName: cleanIngredientName(possibleName),
      quantity: parseNumber(possibleQuantity) || 1,
      unit: normalizeUnit(possibleUnit) || "unit",
      costPerUnit: 0,
      prepNote: "",
      sortOrder: ingredients.length + 1,
    });
  }

  return ingredients;
}

function findIngredientHeaderRowIndex(rows: string[][]): number {
  return rows.findIndex((row) => {
    const normalizedCells = row.map(normalizeKey);

    const hasIngredientColumn = normalizedCells.some((cell) =>
      [
        "ingredient",
        "ingredients",
        "ingredient name",
        "item",
        "item name",
        "product",
        "product name",
        "raw material",
        "description",
        "name",
      ].includes(cell),
    );

    const hasQuantityColumn = normalizedCells.some((cell) =>
      ["quantity", "qty", "amount", "recipe quantity", "yield quantity"].includes(
        cell,
      ),
    );

    return hasIngredientColumn && hasQuantityColumn;
  });
}

function findFirstHeaderIndex(headerRow: string[], possibleKeys: string[]): number {
  return headerRow.findIndex((cell) => possibleKeys.includes(cell));
}

function findQuantityInRow(row: string[], nameIndex: number): string {
  const cellsAfterName = row.slice(nameIndex + 1);
  const quantity = cellsAfterName.find((cell) => looksLikeQuantity(cell));

  return quantity ?? "";
}

function findUnitInRow(row: string[], nameIndex: number): string {
  const cellsAfterName = row.slice(nameIndex + 1);
  const unit = cellsAfterName.find((cell) => looksLikeUnit(cell));

  return unit ?? guessUnitFromText(row.join(" "));
}

function findRecipeName(rows: string[][]): string | null {
  for (const row of rows.slice(0, 15)) {
    const normalizedRow = row.map(normalizeKey);

    const recipeLabelIndex = normalizedRow.findIndex((cell) =>
      ["recipe", "recipe name", "menu item", "dish", "dish name", "item name"].includes(
        cell,
      ),
    );

    if (recipeLabelIndex >= 0) {
      const nextValue = row[recipeLabelIndex + 1];

      if (nextValue && isRecipeTitle(nextValue)) {
        return toTitleCase(nextValue);
      }
    }

    const possibleTitle = row.find((cell) => isRecipeTitle(cell));

    if (possibleTitle) {
      return toTitleCase(possibleTitle);
    }
  }

  return null;
}

function findNumberAfterLabels(rows: string[][], labels: string[]): number {
  for (const row of rows.slice(0, 30)) {
    const normalizedRow = row.map(normalizeKey);

    for (const label of labels) {
      const labelIndex = normalizedRow.findIndex((cell) => cell.includes(label));

      if (labelIndex >= 0) {
        const nextValue = row[labelIndex + 1] ?? row[labelIndex];
        const value = parseNumber(nextValue);

        if (value > 0) {
          return value;
        }
      }
    }
  }

  return 0;
}

function extractInstructions(rows: string[][]): string {
  const instructionStartIndex = rows.findIndex((row) => {
    const joinedRow = normalizeKey(row.join(" "));

    return (
      joinedRow.includes("instruction") ||
      joinedRow.includes("method") ||
      joinedRow.includes("procedure") ||
      joinedRow.includes("direction")
    );
  });

  if (instructionStartIndex === -1) {
    return "";
  }

  return rows
    .slice(instructionStartIndex + 1)
    .map((row) => row.filter(Boolean).join(" ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function guessPortionUnit(rows: string[][]): string | null {
  const joinedText = normalizeKey(rows.flat().join(" "));

  if (joinedText.includes("oz")) {
    return "oz";
  }

  if (joinedText.includes("gram") || joinedText.includes(" g ")) {
    return "g";
  }

  if (joinedText.includes("lb")) {
    return "lb";
  }

  if (joinedText.includes("portion")) {
    return "portion";
  }

  return null;
}

function isIngredientName(value: string, row: string[]): boolean {
  const cleanedValue = cleanIngredientName(value);
  const normalizedValue = normalizeKey(cleanedValue);
  const normalizedRow = normalizeKey(row.join(" "));

  if (cleanedValue.length < 2) {
    return false;
  }

  if (
    [
      "ingredient",
      "ingredients",
      "qty",
      "quantity",
      "unit",
      "uom",
      "method",
      "instruction",
      "procedure",
      "recipe",
      "servings",
      "yield",
      "total",
    ].includes(normalizedValue)
  ) {
    return false;
  }

  if (normalizedRow.includes("total cost")) {
    return false;
  }

  if (/^\d+(\.\d+)?$/.test(cleanedValue)) {
    return false;
  }

  return /[a-zA-Z]/.test(cleanedValue);
}

function looksLikeQuantity(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim()) || /^\d+\/\d+$/.test(value.trim());
}

function looksLikeUnit(value: string): boolean {
  return unitWords.includes(normalizeUnit(value));
}

function guessUnitFromText(text: string): string {
  const normalizedText = normalizeKey(text);

  for (const unit of unitWords) {
    if (normalizedText.includes(unit)) {
      return normalizeUnit(unit);
    }
  }

  return "";
}

function normalizeUnit(value: string): string {
  const normalized = normalizeKey(value);

  if (normalized === "lbs") {
    return "lb";
  }

  if (normalized === "pieces") {
    return "piece";
  }

  if (normalized === "cups") {
    return "cup";
  }

  if (normalized === "portions") {
    return "portion";
  }

  return normalized;
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");

  if (lastDotIndex === -1) {
    return "";
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

function cleanRecipeName(fileName: string): string {
  return toTitleCase(
    fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function guessCategory(text: string): string {
  const normalizedText = normalizeKey(text);

  if (
    normalizedText.includes("chicken") ||
    normalizedText.includes("beef") ||
    normalizedText.includes("fish") ||
    normalizedText.includes("pasta") ||
    normalizedText.includes("rice")
  ) {
    return "Entree";
  }

  if (
    normalizedText.includes("dessert") ||
    normalizedText.includes("cake") ||
    normalizedText.includes("sweet")
  ) {
    return "Dessert";
  }

  if (
    normalizedText.includes("sauce") ||
    normalizedText.includes("dressing") ||
    normalizedText.includes("chutney")
  ) {
    return "Sauce";
  }

  if (
    normalizedText.includes("salad") ||
    normalizedText.includes("side")
  ) {
    return "Side";
  }

  if (
    normalizedText.includes("appetizer") ||
    normalizedText.includes("starter")
  ) {
    return "Appetizer";
  }

  return "Other";
}

function cleanIngredientName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[-•*]+/, "")
    .trim();
}

function cellToString(value: CellValue): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isRecipeTitle(value: string): boolean {
  const cleanedValue = value.trim();

  if (cleanedValue.length < 3 || cleanedValue.length > 80) {
    return false;
  }

  if (!/[a-zA-Z]/.test(cleanedValue)) {
    return false;
  }

  const normalizedValue = normalizeKey(cleanedValue);

  return ![
    "ingredient",
    "ingredients",
    "quantity",
    "qty",
    "unit",
    "instructions",
    "method",
    "procedure",
  ].includes(normalizedValue);
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseNumber(value: string): number {
  const trimmed = value.trim();

  if (/^\d+\/\d+$/.test(trimmed)) {
    const [topValue, bottomValue] = trimmed.split("/");
    const top = Number(topValue);
    const bottom = Number(bottomValue);

    return bottom > 0 ? top / bottom : 0;
  }

  const parsed = Number(trimmed.replace(/[$,%]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}