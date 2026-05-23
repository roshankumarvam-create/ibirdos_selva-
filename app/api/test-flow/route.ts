import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const [invoice] = await sql`
      INSERT INTO invoices (
        vendor_name,
        invoice_number,
        invoice_total,
        status
      )
      VALUES (
        'Test Vendor',
        'INV-1001',
        120.50,
        'review'
      )
      RETURNING *;
    `;

    const [ingredient] = await sql`
      INSERT INTO ingredients (
        name,
        latest_cost,
        unit
      )
      VALUES (
        'Chicken Breast',
        3.25,
        'lb'
      )
      RETURNING *;
    `;

    const [invoiceLine] = await sql`
      INSERT INTO invoice_lines (
        invoice_id,
        ingredient_id,
        item_text,
        quantity,
        unit,
        unit_price,
        line_total
      )
      VALUES (
        ${invoice.id},
        ${ingredient.id},
        'Chicken Breast 10 lb',
        10,
        'lb',
        3.25,
        32.50
      )
      RETURNING *;
    `;

    return NextResponse.json({
      success: true,
      message: "Invoice → Ingredient → InvoiceLine working",
      invoice,
      ingredient,
      invoiceLine,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}